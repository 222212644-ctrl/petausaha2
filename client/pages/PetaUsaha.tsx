import { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin, Filter, RotateCcw, Menu, X, Search, Phone, ExternalLink } from 'lucide-react';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Business {
  id: string;
  nama_usaha: string;
  alamat: string;
  jenis_peta: string;
  kbli_kategori: string;
  kbli_kode: string;
  kabupaten_kota: string;
  kecamatan: string;
  kelurahan_desa: string;
  sls: string;
  blok_sensus: string;
  coordinates: [number, number];
  telepon?: string;
  sumber_data: string;
}

interface BoundaryFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: number[][][][];
  };
  properties: {
    gid: number;
    luas: number;
    idkec?: string;
    kdkab: string;
    kdkec?: string;
    nmkab: string;
    nmkec?: string;
    kdprov: string;
    nmprov: string;
    sumber: string;
    periode: string;
    // Desa properties
    iddesa?: string;
    kddesa?: string;
    nmdesa?: string;
  };
}

interface BoundaryData {
  type: string;
  features: BoundaryFeature[];
}

interface Filters {
  jenis_peta: string;
  kbli_kategori: string;
  kecamatan: string;
  kelurahan_desa: string;
  area_unit: 'sls' | 'blok_sensus';
  area_value: string;
  sumber_data: string;
}

// Component to handle map navigation
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  
  return null;
}

export default function PetaUsaha() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([3.5952, 98.6722]);
  const [mapZoom, setMapZoom] = useState(12);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [boundaryData, setBoundaryData] = useState<BoundaryData | null>(null);
  const [desaData, setDesaData] = useState<BoundaryData | null>(null);
  const [slsData, setSlsData] = useState<BoundaryData | null>(null);
  const [currentBoundary, setCurrentBoundary] = useState<BoundaryFeature | null>(null);
  const [hoveredBoundary, setHoveredBoundary] = useState<BoundaryFeature | null>(null);
  const [displayBoundary, setDisplayBoundary] = useState<BoundaryFeature | null>(null);
  const [currentBoundaryLevel, setCurrentBoundaryLevel] = useState<'kecamatan' | 'desa' | 'sls'>('kecamatan');
  const mapRef = useRef<L.Map | null>(null);

  const [filters, setFilters] = useState<Filters>({
    jenis_peta: 'all',
    kbli_kategori: 'all',
    kecamatan: 'all',
    kelurahan_desa: 'all',
    area_unit: 'sls',
    area_value: 'all',
    sumber_data: 'all'
  });

  useEffect(() => {
    // Load geojson data
    Promise.all([
      fetch('/geojson/businesses-medan.geojson').then(response => response.json()),
      fetch('/geojson/final_kec_202411275.geojson').then(response => response.json()),
      fetch('/geojson/final_desa_202411275.geojson').then(response => response.json()),
      fetch('/geojson/final_sls_202411275.geojson').then(response => response.json())
    ])
    .then(([businessData, boundaryData, desaData]) => {
      const processedBusinessData = businessData.features.map((feature: any) => ({
        ...feature.properties,
        coordinates: [feature.geometry.coordinates[1], feature.geometry.coordinates[0]] as [number, number]
      }));
      setBusinesses(processedBusinessData);
      setFilteredBusinesses(processedBusinessData);
      setBoundaryData(boundaryData);
      setDesaData(desaData);
      setLoading(false);
    })
    .catch(error => {
      console.error('Error loading data:', error);
      setLoading(false);
    });
  }, []);

  // --- NEW: load SLS separately (to keep minimal diffs and robust error handling) ---
	useEffect(() => {
		fetch('/geojson/final_sls_202411275.geojson')
			.then(res => res.json())
			.then((data) => setSlsData(data))
			.catch(err => {
				console.warn('SLS geojson missing or failed to load', err);
				setSlsData(null);
			});
	}, []);

  // Filter businesses based on selected filters and search query
  useEffect(() => {
    let filtered = businesses;

    // Apply search filter (include SLS, Kelurahan/Desa, Kecamatan, Sumber Data)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(b => {
        return (
          (b.nama_usaha && b.nama_usaha.toLowerCase().includes(q)) ||
          (b.alamat && b.alamat.toLowerCase().includes(q)) ||
          (b.sls && String(b.sls).toLowerCase().includes(q)) ||
          (b.kelurahan_desa && b.kelurahan_desa.toLowerCase().includes(q)) ||
          (b.kecamatan && b.kecamatan.toLowerCase().includes(q)) ||
          (b.sumber_data && b.sumber_data.toLowerCase().includes(q))
        );
      });
    }

    // Apply hierarchical filters
    if (filters.jenis_peta !== 'all') {
      filtered = filtered.filter(b => b.jenis_peta === filters.jenis_peta);
    }
    if (filters.kbli_kategori !== 'all') {
      filtered = filtered.filter(b => b.kbli_kategori === filters.kbli_kategori);
    }
    if (filters.kecamatan !== 'all') {
      filtered = filtered.filter(b => b.kecamatan === filters.kecamatan);
    }
    if (filters.kelurahan_desa !== 'all') {
      filtered = filtered.filter(b => b.kelurahan_desa === filters.kelurahan_desa);
    }
    if (filters.area_value !== 'all') {
      const areaField = filters.area_unit === 'sls' ? 'sls' : 'blok_sensus';
      filtered = filtered.filter(b => b[areaField] === filters.area_value);
    }
    if (filters.sumber_data !== 'all') {
      filtered = filtered.filter(b => b.sumber_data === filters.sumber_data);
    }

    setFilteredBusinesses(filtered);

    // Auto-adjust map view based on filtered results
    if (filtered.length > 0) {
      const lats = filtered.map(b => b.coordinates[0]);
      const lngs = filtered.map(b => b.coordinates[1]);
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      setMapCenter([centerLat, centerLng]);
      
      // Adjust zoom based on data spread
      const latSpread = Math.max(...lats) - Math.min(...lats);
      const lngSpread = Math.max(...lngs) - Math.min(...lngs);
      const maxSpread = Math.max(latSpread, lngSpread);
      let newZoom = 12;
      if (maxSpread < 0.01) newZoom = 15;
      else if (maxSpread < 0.05) newZoom = 13;
      else if (maxSpread > 0.2) newZoom = 10;
      setMapZoom(newZoom);
    }
  }, [filters, businesses, searchQuery]);

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      
      // Reset dependent filters when parent filter changes (hierarchical filtering)
      if (key === 'jenis_peta') {
        newFilters.kbli_kategori = 'all';
        newFilters.sumber_data = 'all';
        newFilters.kecamatan = 'all';
        newFilters.kelurahan_desa = 'all';
        newFilters.area_value = 'all';
      } else if (key === 'kbli_kategori') {
        newFilters.sumber_data = 'all';
        newFilters.kecamatan = 'all';
        newFilters.kelurahan_desa = 'all';
        newFilters.area_value = 'all';
      } else if (key === 'sumber_data') {
        newFilters.kecamatan = 'all';
        newFilters.kelurahan_desa = 'all';
        newFilters.area_value = 'all';
      } else if (key === 'kecamatan') {
        newFilters.kelurahan_desa = 'all';
        newFilters.area_value = 'all';
      } else if (key === 'kelurahan_desa') {
        newFilters.area_value = 'all';
      } else if (key === 'area_unit') {
        newFilters.area_value = 'all';
      }
      
      return newFilters;
    });
  };

  const resetFilters = () => {
    setFilters({
      jenis_peta: 'all',
      kbli_kategori: 'all',
      kecamatan: 'all',
      kelurahan_desa: 'all',
      area_unit: 'sls',
      area_value: 'all',
      sumber_data: 'all'
    });
    setSearchQuery('');
    setSelectedBusiness(null);
  };

  // Navigate to business on map
  const navigateToBusiness = (business: Business) => {
    setMapCenter(business.coordinates);
    setMapZoom(16);
    setSelectedBusiness(business);
    
    // Smooth zoom to business location
    if (mapRef.current) {
      mapRef.current.setView(business.coordinates, 16, {
        animate: true,
        duration: 1.2,
        easeLinearity: 0.25
      });
    }
    
    // Auto-update filters based on selected business
    setFilters({
      jenis_peta: business.jenis_peta,
      kbli_kategori: business.kbli_kategori,
      kecamatan: business.kecamatan,
      kelurahan_desa: business.kelurahan_desa,
      area_unit: 'sls',
      area_value: business.sls,
      sumber_data: business.sumber_data
    });
  };

  // Get unique values for dropdown options based on current filters (hierarchical)
  const getFilteredOptions = (field: keyof Business, dependsOn?: keyof Filters): string[] => {
    let dataToFilter = businesses;
    
    if (dependsOn) {
      // Apply filters up to the dependent field (hierarchical filtering)
      if (filters.jenis_peta !== 'all' && field !== 'jenis_peta') {
        dataToFilter = dataToFilter.filter(b => b.jenis_peta === filters.jenis_peta);
      }
      if (filters.kbli_kategori !== 'all' && !['jenis_peta', 'kbli_kategori'].includes(field)) {
        dataToFilter = dataToFilter.filter(b => b.kbli_kategori === filters.kbli_kategori);
      }
      if (filters.sumber_data !== 'all' && !['jenis_peta', 'kbli_kategori', 'sumber_data'].includes(field)) {
        dataToFilter = dataToFilter.filter(b => b.sumber_data === filters.sumber_data);
      }
      if (filters.kecamatan !== 'all' && !['jenis_peta', 'kbli_kategori', 'sumber_data', 'kecamatan'].includes(field)) {
        dataToFilter = dataToFilter.filter(b => b.kecamatan === filters.kecamatan);
      }
      if (filters.kelurahan_desa !== 'all' && field === (filters.area_unit === 'sls' ? 'sls' : 'blok_sensus')) {
        dataToFilter = dataToFilter.filter(b => b.kelurahan_desa === filters.kelurahan_desa);
      }
    }
    
    const values = dataToFilter.map(b => String(b[field])).filter(Boolean);
    return Array.from(new Set(values)).sort();
  };

  // Check if a filter is disabled based on hierarchy
  const isFilterDisabled = (filterKey: keyof Filters) => {
    if (filterKey === 'jenis_peta') return false;
    if (filterKey === 'kbli_kategori' && filters.jenis_peta === 'all') return true;
    if (filterKey === 'sumber_data' && filters.jenis_peta !== 'prelist') return true;
    if (filterKey === 'kecamatan' && filters.kbli_kategori === 'all') return true;
    if (filterKey === 'kelurahan_desa' && filters.kecamatan === 'all') return true;
    if (filterKey === 'area_value' && filters.kelurahan_desa === 'all') return true;
    return false;
  };

  // Generate Google Maps link with coordinates and business name
  const generateGoogleMapsLink = (business: Business) => {
    const lat = business.coordinates[0];
    const lng = business.coordinates[1];
    const name = encodeURIComponent(business.nama_usaha);
    return `https://www.google.com/maps?q=${lat},${lng}&z=16&t=m&hl=id&label=${name}`;
  };

  // ambang zoom untuk switching dengan hysteresis
  const ENTER_DESA_ZOOM = 14; // tetap dipakai untuk switching (opsional)
  const EXIT_DESA_ZOOM = 12;  // kembali ke kecamatan saat zoom <= 12
  const lastBoundaryLevel = useRef<'kecamatan' | 'desa' | 'sls'>(currentBoundaryLevel);

  // --- CHANGED: toggle untuk memaksa tampilkan desa + turunkan ambang jadi 13 ---
  const [forceDesa, setForceDesa] = useState(false);
  const DESA_VISIBLE_ZOOM = 13;
  const SLS_VISIBLE_ZOOM = 15;
  const showSls = mapZoom >= SLS_VISIBLE_ZOOM;
  const showDesa = forceDesa || mapZoom >= DESA_VISIBLE_ZOOM;

  // --- MOVED UP: visibleDesa + visibleSls helpers (state, timers, update & schedule)
  const [visibleDesa, setVisibleDesa] = useState<BoundaryFeature[] | null>(null);
  const visibleDesaTimer = useRef<number | null>(null);

  const updateVisibleDesa = () => {
    if (!desaData || !mapRef.current) {
      setVisibleDesa(null);
      return;
    }
    try {
      const bounds = mapRef.current.getBounds();
      const features = desaData.features.filter(f => {
        try {
          const fb = L.geoJSON((f as any).geometry as any).getBounds();
          return bounds.intersects(fb);
        } catch {
          return false;
        }
      });
      setVisibleDesa(features);
    } catch {
      setVisibleDesa(null);
    }
  };

  const scheduleUpdateVisibleDesa = () => {
    if (visibleDesaTimer.current) window.clearTimeout(visibleDesaTimer.current);
    visibleDesaTimer.current = window.setTimeout(() => {
      updateVisibleDesa();
      visibleDesaTimer.current = null;
    }, 200);
  };

  useEffect(() => {
    if (showDesa) updateVisibleDesa();
    else setVisibleDesa(null);
    return () => {
      if (visibleDesaTimer.current) window.clearTimeout(visibleDesaTimer.current);
    };
  }, [desaData, showDesa]);

  const [visibleSls, setVisibleSls] = useState<BoundaryFeature[] | null>(null);
  const visibleSlsTimer = useRef<number | null>(null);

  const updateVisibleSls = () => {
    if (!slsData || !mapRef.current) {
      setVisibleSls(null);
      return;
    }
    try {
      const bounds = mapRef.current.getBounds();
      const features = slsData.features.filter(f => {
        try {
          const fb = L.geoJSON((f as any).geometry as any).getBounds();
          return bounds.intersects(fb);
        } catch {
          return false;
        }
      });
      setVisibleSls(features);
    } catch {
      setVisibleSls(null);
    }
  };

  const scheduleUpdateVisibleSls = () => {
    if (visibleSlsTimer.current) window.clearTimeout(visibleSlsTimer.current);
    visibleSlsTimer.current = window.setTimeout(() => {
      updateVisibleSls();
      visibleSlsTimer.current = null;
    }, 200);
  };

  useEffect(() => {
    if (showSls) updateVisibleSls();
    else setVisibleSls(null);
    return () => {
      if (visibleSlsTimer.current) window.clearTimeout(visibleSlsTimer.current);
    };
  }, [slsData, showSls]);
  // --- end moved helpers ---

  // --- NEW: ensure handler & getter exist before map listeners ---
  const handleMapZoom = (zoom: number) => {
    // jika user memaksa desa, jangan turun di bawah desa kecuali zoom cukup untuk SLS
    if (forceDesa) {
      if (zoom >= SLS_VISIBLE_ZOOM) {
        if (lastBoundaryLevel.current !== 'sls') {
          lastBoundaryLevel.current = 'sls';
          setCurrentBoundaryLevel('sls');
          setCurrentBoundary(null);
          setHoveredBoundary(null);
        }
        return;
      }
      if (lastBoundaryLevel.current !== 'desa') {
        lastBoundaryLevel.current = 'desa';
        setCurrentBoundaryLevel('desa');
        setCurrentBoundary(null);
        setHoveredBoundary(null);
      }
      return;
    }

    // normal switching: kecamatan -> desa -> sls
    if (zoom >= SLS_VISIBLE_ZOOM) {
      if (lastBoundaryLevel.current !== 'sls') {
        lastBoundaryLevel.current = 'sls';
        setCurrentBoundaryLevel('sls');
        setCurrentBoundary(null);
        setHoveredBoundary(null);
      }
    } else if (zoom >= DESA_VISIBLE_ZOOM) {
      if (lastBoundaryLevel.current !== 'desa') {
        lastBoundaryLevel.current = 'desa';
        setCurrentBoundaryLevel('desa');
        setCurrentBoundary(null);
        setHoveredBoundary(null);
      }
    } else {
      if (lastBoundaryLevel.current !== 'kecamatan') {
        lastBoundaryLevel.current = 'kecamatan';
        setCurrentBoundaryLevel('kecamatan');
        setCurrentBoundary(null);
        setHoveredBoundary(null);
      }
    }
  };

  const getActiveBoundaryData = () => {
    // Prioritas level: sls -> desa -> kecamatan
    if (currentBoundaryLevel === 'sls' && slsData) return slsData;
    if (currentBoundaryLevel === 'desa' && desaData && (forceDesa || mapZoom >= DESA_VISIBLE_ZOOM)) return desaData;
    return boundaryData;
  };
  // --- end new functions ---

  // Handle map zoom and move events: update mapZoom so showDesa/reactive lists bereaksi
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const handleZoomMove = () => {
      const z = map.getZoom();
      setMapZoom(z);         // pastikan state mapZoom sinkron
      handleMapZoom(z);      // panggil handler level
      if (z >= SLS_VISIBLE_ZOOM) {
        scheduleUpdateVisibleSls();
      } else if (forceDesa || z >= DESA_VISIBLE_ZOOM) {
        scheduleUpdateVisibleDesa();
      } else {
        setVisibleDesa(null);
        setVisibleSls(null);
      }
    };

    map.on('zoomend', handleZoomMove);
    map.on('moveend', handleZoomMove);

    return () => {
      map.off('zoomend', handleZoomMove);
      map.off('moveend', handleZoomMove);
    };
  }, [mapRef.current, boundaryData, desaData, slsData, forceDesa]);
 
  // Update display boundary based on hover and current selection
  useEffect(() => {
    if (hoveredBoundary) {
      setDisplayBoundary(hoveredBoundary);
    } else if (currentBoundary) {
      setDisplayBoundary(currentBoundary);
    } else {
      setDisplayBoundary(null);
    }
  }, [hoveredBoundary, currentBoundary]);

  // --- NEW: gabungkan semua kecamatan menjadi satu MultiPolygon untuk outline kota ---
  const cityBoundaryFeature = useMemo(() => {
    if (!boundaryData) return null;
    const allPolygons: any[] = [];

    boundaryData.features.forEach(f => {
      const geom = (f as any).geometry;
      if (!geom) return;
      if (geom.type === 'Polygon') {
        // Polygon: [ [lng, lat], ... ]
        allPolygons.push(geom.coordinates);
      } else if (geom.type === 'MultiPolygon') {
        // MultiPolygon: [ [ [lng, lat], ... ], ... ]
        allPolygons.push(...geom.coordinates);
      }
    });

    if (allPolygons.length === 0) return null;

    return {
      type: 'Feature',
      properties: { name: 'Kota Medan (gabungan)' },
      geometry: {
        type: 'MultiPolygon',
        coordinates: allPolygons
      }
    } as any;
  }, [boundaryData]);

  // Handle boundary selection from filter (kecamatan | kelurahan)
  const handleBoundarySelection = (boundaryType: 'kecamatan' | 'kelurahan', value: string) => {
    // reset when selecting "all"
    if (value === 'all') {
      setCurrentBoundary(null);
      // optionally reset level to kecamatan
      setCurrentBoundaryLevel('kecamatan');
      return;
    }

    if (!mapRef.current) return;

    let selectedBoundary: BoundaryFeature | undefined;

    if (boundaryType === 'kecamatan') {
      if (!boundaryData) return;
      selectedBoundary = boundaryData.features.find(f => String(f.properties.nmkec) === value);
      if (selectedBoundary) {
        setCurrentBoundaryLevel('kecamatan');
        setCurrentBoundary(selectedBoundary);
      }
    } else {
      if (!desaData) return;
      selectedBoundary = desaData.features.find(f => String(f.properties.nmdesa) === value);
      if (selectedBoundary) {
        setCurrentBoundaryLevel('desa');
        setCurrentBoundary(selectedBoundary);
      }
    }

    if (selectedBoundary) {
      try {
        const bounds = L.geoJSON((selectedBoundary as any).geometry as any).getBounds();
        mapRef.current.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: boundaryType === 'kelurahan' ? 16 : 13,
          animate: true,
          duration: 0.8
        });
      } catch (err) {
        console.error('Error fitting bounds for selected boundary:', err);
      }
    }
  };

  // --- NEW: helper to format title/subtitle for boundary overlay (supports kecamatan/desa/sls) ---
  const getBoundaryInfo = (b: BoundaryFeature | null) => {
    if (!b) return { title: '', typeLabel: '', extra: '' };
    const p: any = b.properties || {};
    // kecamatan
    if (currentBoundaryLevel === 'kecamatan') {
      const title = p.nmkec || p.nmkab || p.nmprov || `Kecamatan ${p.gid || ''}`;
      const typeLabel = 'Kecamatan';
      const extraParts: string[] = [];
      const extra = extraParts.join(' • ');
      return { title, typeLabel, extra };
    }
    // desa
    if (currentBoundaryLevel === 'desa') {
      const title = (p.nmdesa && p.nmdesa !== 'Desa.Medan') ? p.nmdesa : (p.nmkec || p.nmkab || `Desa ${p.gid || ''}`);
      const typeLabel = 'Desa';
      const extraParts: string[] = [];
      if (p.nmkec) extraParts.push(`Kec: ${p.nmkec}`);
      const extra = extraParts.join(' • ');
      return { title, typeLabel, extra };
    }
    // sls: include kelurahan/desa name (if present) plus kecamatan/kabupaten
    const slsName = p.nmsls || p.nm_sls || p.sls || p.nama || p.name || p.blok_sensus || '';
    const title = slsName || `SLS ${p.gid ?? ''}`;
    const typeLabel = 'SLS';
    // try several common property names for kelurahan/desa
    const village = p.nmdesa || p.nama_kelurahan || p.kelurahan || p.nmkel || p.nama_kel || p.keldesa || '';
    const extraParts: string[] = [];
    if (village) extraParts.push(`Desa: ${village}`);
    if (p.nmkec) extraParts.push(`Kec: ${p.nmkec}`);
    const extra = extraParts.join(' • ');
    return { title, typeLabel, extra };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data usaha...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Layout - Vertical */}
      <div className="lg:hidden">
        {/* Mobile Filter Toggle */}
        <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
          <Button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            size="sm"
          >
            <Filter className="h-4 w-4 mr-2" />
            {sidebarOpen ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
          </Button>
        </div>

        {/* Mobile Filters (moved above business list) */}
        {sidebarOpen && (
          <div className="bg-white border-b border-gray-200 max-h-96 overflow-y-auto flex-shrink-0 filter-scroll">
            {/* Mobile Filter Content */}
            <div className="p-4 space-y-3">
              {/* Search Input */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-orange-700">Cari Usaha</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Cari nama, alamat, atau sumber data usaha..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 text-sm"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-orange-700">Jenis Peta</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Select value={filters.jenis_peta} onValueChange={(value) => updateFilter('jenis_peta', value)}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Pilih Jenis Peta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">-- All --</SelectItem>
                      <SelectItem value="prelist">Prelist</SelectItem>
                      <SelectItem value="listing">Listing</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 lg:pb-3">
                  <CardTitle className="text-xs lg:text-sm text-orange-700">Sumber Data</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Select 
                    value={filters.sumber_data} 
                    onValueChange={(value) => updateFilter('sumber_data', value)}
                    disabled={isFilterDisabled('sumber_data')}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Pilih Sumber Data" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">-- All --</SelectItem>
                      {getFilteredOptions('sumber_data', 'jenis_peta').map(sumber => (
                        <SelectItem key={sumber} value={sumber} className="text-sm">{sumber}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 lg:pb-3">
                  <CardTitle className="text-xs lg:text-sm text-orange-700">Kategori Usaha</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Select 
                    value={filters.kbli_kategori} 
                    onValueChange={(value) => updateFilter('kbli_kategori', value)}
                    disabled={isFilterDisabled('kbli_kategori')}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Pilih Kategori KBLI" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">-- All --</SelectItem>
                      {getFilteredOptions('kbli_kategori', 'jenis_peta').map(kategori => (
                        <SelectItem key={kategori} value={kategori} className="text-sm">{kategori}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 lg:pb-3">
                  <CardTitle className="text-xs lg:text-sm text-orange-700">Kecamatan</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Select 
                    value={filters.kecamatan} 
                    onValueChange={(value) => {
                      updateFilter('kecamatan', value);
                      if (value !== 'all') {
                        handleBoundarySelection('kecamatan', value);
                      }
                    }}
                    disabled={isFilterDisabled('kecamatan')}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Pilih Kecamatan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">-- All --</SelectItem>
                      {getFilteredOptions('kecamatan', 'kbli_kategori').map(kecamatan => (
                        <SelectItem key={kecamatan} value={kecamatan} className="text-sm">{kecamatan}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 lg:pb-3">
                  <CardTitle className="text-xs lg:text-sm text-orange-700">Kelurahan/Desa</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Select 
                    value={filters.kelurahan_desa} 
                    onValueChange={(value) => { updateFilter('kelurahan_desa', value); if (value !== 'all') handleBoundarySelection('kelurahan', value); }}
                    disabled={isFilterDisabled('kelurahan_desa')}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Pilih Kelurahan/Desa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">-- All --</SelectItem>
                      {getFilteredOptions('kelurahan_desa', 'kecamatan').map(kelurahan => (
                        <SelectItem key={kelurahan} value={kelurahan} className="text-sm">{kelurahan}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 lg:pb-3">
                  <CardTitle className="text-xs lg:text-sm text-orange-700">SLS atau Lingkungan Setempat</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2 lg:space-y-3">
                  <Select value={filters.area_unit} onValueChange={(value) => updateFilter('area_unit', value as 'sls' | 'blok_sensus')}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Pilih Unit Area" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sls">SLS</SelectItem>
                      <SelectItem value="blok_sensus">Blok Sensus</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select 
                    value={filters.area_value} 
                    onValueChange={(value) => updateFilter('area_value', value)}
                    disabled={isFilterDisabled('area_value')}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder={`Pilih ${filters.area_unit.toUpperCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">-- All --</SelectItem>
                      {getFilteredOptions(filters.area_unit === 'sls' ? 'sls' : 'blok_sensus', 'kelurahan_desa').map(area => (
                        <SelectItem key={area} value={area} className="text-sm">{area}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Button
                onClick={resetFilters}
                variant="outline"
                className="w-full text-sm"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        )}

        {/* Mobile Business List - always visible on mobile (re-inserted) */}
        <div className="p-3 bg-white border-b border-gray-200">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-orange-700">
                Daftar Nama Usaha ({filteredBusinesses.length} usaha)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 filter-scroll" style={{ maxHeight: '160px', overflowY: 'auto' }}>
              {filteredBusinesses.length > 0 ? (
                <div className="space-y-1">
                  {filteredBusinesses.slice(0, 10).map((business, index) => (
                    <div
                      key={business.id}
                      onClick={() => navigateToBusiness(business)}
                      className={`text-xs text-gray-700 py-1 px-2 rounded border cursor-pointer transition-colors ${
                        selectedBusiness?.id === business.id 
                          ? 'bg-orange-100 border-orange-300' 
                          : 'bg-gray-50 border-gray-100 hover:bg-orange-50'
                      }`}
                    >
                      <div className="font-medium truncate">{index + 1}. {business.nama_usaha}</div>
                      <div className="text-xs text-gray-500 truncate">{business.alamat}</div>
                      <div className="text-[11px] text-gray-400 mt-1 truncate">
                        SLS: {String(business.sls || '')} • Desa: {business.kelurahan_desa || '-'} • Kec: {business.kecamatan || '-'} • Sumber: {business.sumber_data || '-'}
                      </div>
                    </div>
                  ))}
                  {filteredBusinesses.length > 10 && (
                    <div className="text-xs text-gray-500 text-center py-2">
                      ... dan {filteredBusinesses.length - 10} lainnya
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-500 text-center py-4">
                  Tidak ada usaha yang sesuai dengan filter
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mobile Map Area */}
        <div className="bg-white border-b border-gray-200 p-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900">Peta</h1>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span className="font-semibold">{filteredBusinesses.length} usaha</span>
            </div>
          </div>
        </div>

        {/* Mobile Map Container */}
        <div className="h-96 flex-shrink-0 map-container relative">
          {/* Boundary Level Indicator - Mobile (removed level label, keep toggle) */}
          <div className="absolute top-2 left-2 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 px-2 py-1 transition-all duration-300 ease-in-out">
            <div className="text-xs font-medium text-gray-700 flex items-center">
              {/* Toggle kecil untuk paksa tampilkan desa (tetap ada) */}
              <button
                onClick={() => setForceDesa(prev => !prev)}
                className={`text-xs px-2 py-0.5 rounded border ${forceDesa ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-700 border-gray-200'}`}
                title="Tampilkan/ sembunyikan batas Desa (force)"
              >
                {forceDesa ? 'Desa: On' : 'Desa: Off'}
              </button>
            </div>
          </div>

          {/* Boundary Info Overlay - Mobile */}
          {displayBoundary && (
            <div className="absolute top-2 right-2 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-2 max-w-[200px] transition-all duration-300 ease-in-out">
              {(() => {
                const info = getBoundaryInfo(displayBoundary);
                return (
                  <>
                    <div className="text-xs font-semibold text-gray-900 mb-1">{info.title}</div>
                    <div className="text-xs text-gray-600">{info.typeLabel} • {displayBoundary.properties.nmkab}</div>
                    {info.extra && <div className="text-xs text-gray-500">{info.extra}</div>}
                  </>
                );
              })()}
              {hoveredBoundary && hoveredBoundary.properties.gid === displayBoundary.properties.gid && (
                <div className="text-xs text-blue-600">Hover • Tap untuk pilih</div>
              )}
              {currentBoundary && currentBoundary.properties.gid === displayBoundary.properties.gid && (
                <div className="text-xs text-green-600">✓ Dipilih</div>
              )}
            </div>
          )}
                      <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              key={`mobile-${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`}
              ref={mapRef}
            >
            <MapController center={mapCenter} zoom={mapZoom} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* ALWAYS-VISIBLE: kecamatan boundaries (all features) */}
            {boundaryData && (
              <GeoJSON
                data={boundaryData as any}
                style={(feature) => {
                  const gid = feature?.properties?.gid;
                  const isSelected = currentBoundary && currentBoundaryLevel === 'kecamatan' && gid === currentBoundary.properties.gid;
                  const isHovered = hoveredBoundary && gid === hoveredBoundary.properties.gid && currentBoundaryLevel === 'kecamatan';
                  // jika desa ditampilkan, pudar kecamatan sebagai background
                  const baseFill = showDesa ? '#bfdbfe' : '#bfdbfe';
                  const baseOpacity = showDesa ? 0.08 : 0.15;
                  return {
                    fillColor: isSelected ? '#10b981' : (isHovered ? '#3b82f6' : baseFill),
                    fillOpacity: isSelected ? 0.35 : (isHovered ? 0.25 : baseOpacity),
                    weight: isSelected ? 3 : 1,
                    opacity: isSelected ? 0.9 : 0.7,
                    color: isSelected ? '#059669' : (isHovered ? '#1d4ed8' : '#3b82f6'),
                    dashArray: isSelected ? undefined : '0'
                  };
                }}
                onEachFeature={(feature, layer) => {
                  layer.on({
                    mouseover: () => setHoveredBoundary(feature as BoundaryFeature),
                    mouseout: () => setHoveredBoundary(null),
                    click: () => {
                      setCurrentBoundary(feature as BoundaryFeature);
                      setCurrentBoundaryLevel('kecamatan');
                    }
                  });
                }}
              />
            )}

            {/* DESA LAYER: render only visible desa features when showDesa */}
            {showDesa && visibleDesa && visibleDesa.length > 0 && (
              <GeoJSON
                data={{
                  type: 'FeatureCollection',
                  features: visibleDesa
                } as any}
                interactive={true}
                style={(feature) => {
                  const gid = feature?.properties?.gid;
                  const isSelected = currentBoundary && currentBoundaryLevel === 'desa' && gid === currentBoundary.properties.gid;
                  const isHovered = hoveredBoundary && gid === hoveredBoundary.properties.gid && currentBoundaryLevel === 'desa';
                  return {
                    fillColor: isSelected ? '#10b981' : (isHovered ? '#3b82f6' : '#bfdbfe'),
                    fillOpacity: isSelected ? 0.35 : (isHovered ? 0.2 : 0.12),
                    weight: isSelected ? 2 : 1,
                    opacity: isSelected ? 0.9 : 0.7,
                    color: isSelected ? '#059669' : (isHovered ? '#1d4ed8' : '#1e40af')
                  };
                }}
                onEachFeature={(feature, layer) => {
                  layer.on({
                    mouseover: () => setHoveredBoundary(feature as BoundaryFeature),
                    mouseout: () => setHoveredBoundary(null),
                    click: () => {
                      setCurrentBoundary(feature as BoundaryFeature);
                      setCurrentBoundaryLevel('desa');
                    }
                  });
                }}
              />
            )}

            {/* SLS LAYER: render only visible SLS features when showSls */}
            {showSls && visibleSls && visibleSls.length > 0 && (
              <GeoJSON
                data={{
                  type: 'FeatureCollection',
                  features: visibleSls
                } as any}
                interactive={true}
                style={(feature) => {
                  const gid = feature?.properties?.gid;
                  const isSelected = currentBoundary && currentBoundaryLevel === 'sls' && gid === currentBoundary.properties.gid;
                  const isHovered = hoveredBoundary && gid === hoveredBoundary.properties.gid && currentBoundaryLevel === 'sls';
                  return {
                    fillColor: isSelected ? '#059669' : (isHovered ? '#0ea5e9' : '#e0f2fe'),
                    fillOpacity: isSelected ? 0.35 : (isHovered ? 0.2 : 0.08),
                    weight: isSelected ? 2 : 0.6,
                    opacity: isSelected ? 0.9 : 0.6,
                    color: isSelected ? '#047857' : (isHovered ? '#0369a1' : '#0284c7')
                  };
                }}
                onEachFeature={(feature, layer) => {
                  layer.on({
                    mouseover: () => setHoveredBoundary(feature as BoundaryFeature),
                    mouseout: () => setHoveredBoundary(null),
                    click: () => { setCurrentBoundary(feature as BoundaryFeature); setCurrentBoundaryLevel('sls'); }
                  });
                }}
              />
            )}

            {/* ALWAYS-VISIBLE: city outline (merged MultiPolygon) */}
            {cityBoundaryFeature && (
              <GeoJSON
                data={cityBoundaryFeature as any}
                style={() => ({
                  fillOpacity: 0,
                  weight: 2,
                  opacity: 0.9,
                  color: '#ef4444',
                  dashArray: '4 4'
                })}
                interactive={false}
              />
            )}

            {/* Boundary Layer (hover / select) */}
            {getActiveBoundaryData() && (
              <GeoJSON
                data={getActiveBoundaryData() as any}
                style={(feature) => {
                  // highlight by gid match regardless of which level is active
                  const isCurrent = currentBoundary && feature?.properties?.gid === currentBoundary.properties.gid;
                  const isHovered = hoveredBoundary && feature?.properties?.gid === hoveredBoundary.properties.gid;
                  return {
                    fillColor: isCurrent ? '#10b981' : (isHovered ? '#3b82f6' : '#e5e7eb'),
                    weight: isCurrent ? 3 : (isHovered ? 2 : 1),
                    opacity: isCurrent ? 0.8 : (isHovered ? 0.6 : 0.3),
                    color: isCurrent ? '#059669' : (isHovered ? '#1d4ed8' : '#9ca3af'),
                    fillOpacity: isCurrent ? 0.3 : (isHovered ? 0.2 : 0.1)
                  };
                }}
                onEachFeature={(feature, layer) => {
                  layer.on({
                    mouseover: () => setHoveredBoundary(feature as BoundaryFeature),
                    mouseout: () => setHoveredBoundary(null),
                    click: () => setCurrentBoundary(feature as BoundaryFeature)
                  });
                }}
              />
            )}
            {filteredBusinesses.map((business) => (
              <Marker
                key={business.id}
                position={business.coordinates}
              >
                <Popup maxWidth={250} className="custom-popup">
                  <div className="p-2">
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm">{business.nama_usaha}</h3>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex items-start">
                        <MapPin className="h-3 w-3 mr-2 flex-shrink-0 mt-0.5" />
                        <span>{business.alamat}</span>
                      </div>
                      {business.telepon && (
                        <div className="flex items-center">
                          <Phone className="h-3 w-3 mr-2 flex-shrink-0" />
                          <a href={`tel:${business.telepon}`} className="text-blue-600 hover:underline">
                            {business.telepon}
                          </a>
                        </div>
                      )}
                                              <div className="flex items-center">
                          <ExternalLink className="h-3 w-3 mr-2 flex-shrink-0" />
                          <a 
                            href={generateGoogleMapsLink(business)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs"
                          >
                            Buka di Google Maps
                          </a>
                        </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Desktop Layout - Horizontal */}
      <div className="hidden lg:flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="w-80 bg-white shadow-lg border-r border-gray-200 flex flex-col">
          {/* Desktop Header */}
          <div className="bg-orange-600 text-white p-4 flex-shrink-0">
            <h2 className="text-lg font-bold">Cari Data Berdasarkan Wilayah</h2>
          </div>

          {/* Desktop Filter Content */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto filter-scroll">
            {/* Search Input */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-orange-700">Cari Usaha</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Cari nama, alamat, atau sumber data usaha..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Jenis Peta - desktop (sama seperti mobile) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-orange-700">Jenis Peta</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Select value={filters.jenis_peta} onValueChange={(value) => updateFilter('jenis_peta', value)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Pilih Jenis Peta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">-- All --</SelectItem>
                    <SelectItem value="prelist">Prelist</SelectItem>
                    <SelectItem value="listing">Listing</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Sumber Data */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-orange-700">Sumber Data</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Select 
                  value={filters.sumber_data} 
                  onValueChange={(value) => updateFilter('sumber_data', value)}
                  disabled={isFilterDisabled('sumber_data')}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Pilih Sumber Data" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">-- All --</SelectItem>
                    {getFilteredOptions('sumber_data', 'jenis_peta').map(sumber => (
                      <SelectItem key={sumber} value={sumber} className="text-sm">{sumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          
            {/* Kategori Usaha */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-orange-700">Kategori Usaha</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Select 
                  value={filters.kbli_kategori} 
                  onValueChange={(value) => updateFilter('kbli_kategori', value)}
                  disabled={isFilterDisabled('kbli_kategori')}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Pilih Kategori KBLI" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">-- All --</SelectItem>
                    {getFilteredOptions('kbli_kategori', 'jenis_peta').map(kategori => (
                      <SelectItem key={kategori} value={kategori} className="text-sm">{kategori}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-orange-700">Kecamatan</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Select 
                  value={filters.kecamatan} 
                  onValueChange={(value) => {
                    updateFilter('kecamatan', value);
                    if (value !== 'all') {
                      handleBoundarySelection('kecamatan', value);
                    }
                  }}
                  disabled={isFilterDisabled('kecamatan')}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Pilih Kecamatan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">-- All --</SelectItem>
                    {getFilteredOptions('kecamatan', 'kbli_kategori').map(kecamatan => (
                      <SelectItem key={kecamatan} value={kecamatan} className="text-sm">{kecamatan}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-orange-700">Kelurahan/Desa</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Select 
                  value={filters.kelurahan_desa} 
                  onValueChange={(value) => updateFilter('kelurahan_desa', value)}
                  disabled={isFilterDisabled('kelurahan_desa')}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Pilih Kelurahan/Desa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">-- All --</SelectItem>
                    {getFilteredOptions('kelurahan_desa', 'kecamatan').map(kelurahan => (
                      <SelectItem key={kelurahan} value={kelurahan} className="text-sm">{kelurahan}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-orange-700">SLS atau Lingkungan Setempat</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <Select value={filters.area_unit} onValueChange={(value) => updateFilter('area_unit', value as 'sls' | 'blok_sensus')}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Pilih Unit Area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sls">SLS</SelectItem>
                    <SelectItem value="blok_sensus">Blok Sensus</SelectItem>
                  </SelectContent>
                </Select>

                <Select 
                  value={filters.area_value} 
                  onValueChange={(value) => updateFilter('area_value', value)}
                  disabled={isFilterDisabled('area_value')}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder={`Pilih ${filters.area_unit.toUpperCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">-- All --</SelectItem>
                    {getFilteredOptions(filters.area_unit === 'sls' ? 'sls' : 'blok_sensus', 'kelurahan_desa').map(area => (
                      <SelectItem key={area} value={area} className="text-sm">{area}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Button
              onClick={resetFilters}
              variant="outline"
              className="w-full text-sm"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>

          {/* Desktop Business Names List */}
          <div className="border-t border-gray-200 bg-gray-50 flex flex-col flex-shrink-0" style={{ height: '300px' }}>
            <div className="p-4 pb-2 flex-shrink-0">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 font-medium">Daftar Nama Usaha:</span>
                <span className="font-semibold text-orange-600">{filteredBusinesses.length} usaha</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 filter-scroll">
              {filteredBusinesses.length > 0 ? (
                <div className="space-y-1">
                  {filteredBusinesses.map((business, index) => (
                    <div
                      key={business.id}
                      onClick={() => navigateToBusiness(business)}
                      className={`text-sm text-gray-700 py-1 px-2 rounded border cursor-pointer transition-colors ${
                        selectedBusiness?.id === business.id 
                          ? 'bg-orange-100 border-orange-300' 
                          : 'bg-white border-gray-100 hover:bg-orange-50'
                      }`}
                    >
                      <div className="font-medium truncate">{index + 1}. {business.nama_usaha}</div>
                      <div className="text-xs text-gray-500 truncate">{business.alamat}</div>
                      <div className="text-[12px] text-gray-400 mt-1 truncate">
                        SLS: {String(business.sls || '')} • Desa: {business.kelurahan_desa || '-'} • Kec: {business.kecamatan || '-'} • Sumber: {business.sumber_data || '-'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-4">
                  Tidak ada usaha yang sesuai dengan filter
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Map Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Map Header */}
          <div className="bg-white shadow-sm border-b border-gray-200 p-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900">Peta</h1>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>Menampilkan</span>
                <span className="font-semibold">{filteredBusinesses.length} usaha</span>
              </div>
            </div>
          </div>

          {/* Map Container */}
          <div className="flex-1 relative overflow-hidden map-container">
            {/* Boundary Info Overlay */}
            {displayBoundary && (
              <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-3 max-w-xs transition-all duration-300 ease-in-out">
                {(() => {
                  const info = getBoundaryInfo(displayBoundary);
                  return (
                    <>
                      <div className="text-sm font-semibold text-gray-900 mb-1">{info.title}</div>
                      <div className="text-xs text-gray-600">{info.typeLabel} • {displayBoundary.properties.nmkab}</div>
                      {info.extra && <div className="text-xs text-gray-500"> {info.extra} </div>}
                    </>
                  );
                })()}
                {hoveredBoundary && hoveredBoundary.properties.gid === displayBoundary.properties.gid && (
                  <div className="text-xs text-blue-600 mt-1">Hover • Klik untuk pilih</div>
                )}
                {currentBoundary && currentBoundary.properties.gid === displayBoundary.properties.gid && (
                  <div className="text-xs text-green-600 mt-1">✓ Dipilih</div>
                )}
              </div>
            )}

            {/* Fixed / corrected Desktop MapContainer */}
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              key={`desktop-${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`}
              ref={mapRef}
            >
              <MapController center={mapCenter} zoom={mapZoom} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* ALWAYS-VISIBLE: kecamatan boundaries (all features) */}
              {boundaryData && (
                <GeoJSON
                  data={boundaryData as any}
                  style={(feature) => {
                    const gid = feature?.properties?.gid;
                    const isSelected = currentBoundary && currentBoundaryLevel === 'kecamatan' && gid === currentBoundary.properties.gid;
                    const isHovered = hoveredBoundary && gid === hoveredBoundary.properties.gid && currentBoundaryLevel === 'kecamatan';
                    // jika desa ditampilkan, pudar kecamatan sebagai background
                    const baseFill = showDesa ? '#bfdbfe' : '#bfdbfe';
                    const baseOpacity = showDesa ? 0.08 : 0.15;
                    return {
                      fillColor: isSelected ? '#10b981' : (isHovered ? '#3b82f6' : baseFill),
                      fillOpacity: isSelected ? 0.35 : (isHovered ? 0.25 : baseOpacity),
                      weight: isSelected ? 3 : 1,
                      opacity: isSelected ? 0.9 : 0.7,
                      color: isSelected ? '#059669' : (isHovered ? '#1d4ed8' : '#3b82f6'),
                      dashArray: isSelected ? undefined : '0'
                    };
                  }}
                  onEachFeature={(feature, layer) => {
                    layer.on({
                      mouseover: () => setHoveredBoundary(feature as BoundaryFeature),
                      mouseout: () => setHoveredBoundary(null),
                      click: () => {
                        setCurrentBoundary(feature as BoundaryFeature);
                        setCurrentBoundaryLevel('kecamatan');
                      }
                    });
                  }}
                />
              )}

              {/* DESA LAYER: render only visible desa features when showDesa */}
              {showDesa && visibleDesa && visibleDesa.length > 0 && (
                <GeoJSON
                  data={{
                    type: 'FeatureCollection',
                    features: visibleDesa
                  } as any}
                  interactive={true}
                  style={(feature) => {
                    const gid = feature?.properties?.gid;
                    const isSelected = currentBoundary && currentBoundaryLevel === 'desa' && gid === currentBoundary.properties.gid;
                    const isHovered = hoveredBoundary && gid === hoveredBoundary.properties.gid && currentBoundaryLevel === 'desa';
                    return {
                      fillColor: isSelected ? '#10b981' : (isHovered ? '#3b82f6' : '#bfdbfe'),
                      fillOpacity: isSelected ? 0.35 : (isHovered ? 0.2 : 0.12),
                      weight: isSelected ? 2 : 1,
                      opacity: isSelected ? 0.9 : 0.7,
                      color: isSelected ? '#059669' : (isHovered ? '#1d4ed8' : '#1e40af')
                    };
                  }}
                  onEachFeature={(feature, layer) => {
                    layer.on({
                      mouseover: () => setHoveredBoundary(feature as BoundaryFeature),
                      mouseout: () => setHoveredBoundary(null),
                      click: () => {
                        setCurrentBoundary(feature as BoundaryFeature);
                        setCurrentBoundaryLevel('desa');
                      }
                    });
                  }}
                />
              )}

              {/* ALWAYS-VISIBLE: city outline (merged MultiPolygon) */}
              {cityBoundaryFeature && (
                <GeoJSON
                  data={cityBoundaryFeature as any}
                  style={() => ({
                    fillOpacity: 0,
                    weight: 2,
                    opacity: 0.9,
                    color: '#ef4444',
                    dashArray: '4 4'
                  })}
                  interactive={false}
                />
              )}

              {/* Boundary Layer (hover / select) */}
              {getActiveBoundaryData() && (
                <GeoJSON
                  data={getActiveBoundaryData() as any}
                  style={(feature) => {
                    const isCurrent = currentBoundary && feature?.properties?.gid === currentBoundary.properties.gid;
                    const isHovered = hoveredBoundary && feature?.properties?.gid === hoveredBoundary.properties.gid;
                    return {
                      fillColor: isCurrent ? '#10b981' : (isHovered ? '#3b82f6' : '#e5e7eb'),
                      weight: isCurrent ? 3 : (isHovered ? 2 : 1),
                      opacity: isCurrent ? 0.8 : (isHovered ? 0.6 : 0.3),
                      color: isCurrent ? '#059669' : (isHovered ? '#1d4ed8' : '#9ca3af'),
                      fillOpacity: isCurrent ? 0.3 : (isHovered ? 0.2 : 0.1)
                    };
                  }}
                  onEachFeature={(feature, layer) => {
                    layer.on({
                      mouseover: () => setHoveredBoundary(feature as BoundaryFeature),
                      mouseout: () => setHoveredBoundary(null),
                      click: () => setCurrentBoundary(feature as BoundaryFeature)
                    });
                  }}
                />
              )}

              {/* Markers */}
              {filteredBusinesses.map((business) => (
                <Marker
                  key={business.id}
                  position={business.coordinates}
                >
                  <Popup maxWidth={300} className="custom-popup">
                    <div className="p-2">
                      <h3 className="font-semibold text-gray-900 mb-2 text-base">{business.nama_usaha}</h3>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-start">
                          <MapPin className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                          <span>{business.alamat}</span>
                        </div>
                        {business.telepon && (
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                            <a href={`tel:${business.telepon}`} className="text-blue-600 hover:underline">
                              {business.telepon}
                            </a>
                          </div>
                        )}
                        <div className="flex items-center">
                          <ExternalLink className="h-4 w-4 mr-2 flex-shrink-0" />
                          <a
                            href={generateGoogleMapsLink(business)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Buka di Google Maps
                          </a>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}