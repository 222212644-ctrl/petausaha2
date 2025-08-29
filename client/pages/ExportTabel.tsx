import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Download, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpDown,
  Menu,
  X
} from 'lucide-react';

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
  sumber_data: string;
}

interface Filters {
  jenis_peta: string;
  kbli_kategori: string;
  kabupaten_kota: string;
  kecamatan: string;
  kelurahan_desa: string;
  sls: string;
  sumber_data: string;
}

type SortField = 'nama_usaha' | 'jenis_peta' | 'kbli_kategori' | 'kecamatan';
type SortDirection = 'asc' | 'desc';

export default function ExportTabel() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<SortField>('nama_usaha');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterOpen, setFilterOpen] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    jenis_peta: 'all',
    kbli_kategori: 'all',
    kabupaten_kota: 'all',
    kecamatan: 'all',
    kelurahan_desa: 'all',
    sls: 'all',
    sumber_data: 'all'
  });

  useEffect(() => {
    // Load geojson data
    fetch('/geojson/businesses-medan.geojson')
      .then(response => response.json())
      .then(data => {
        const businessData = data.features.map((feature: any) => ({
          ...feature.properties,
          coordinates: [feature.geometry.coordinates[1], feature.geometry.coordinates[0]] as [number, number]
        }));
        setBusinesses(businessData);
        setFilteredBusinesses(businessData);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading business data:', error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let filtered = businesses;

    // Filter by search term
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(business =>
        (business.nama_usaha && business.nama_usaha.toLowerCase().includes(q)) ||
        (business.alamat && business.alamat.toLowerCase().includes(q)) ||
        (business.sls && String(business.sls).toLowerCase().includes(q)) ||
        (business.kelurahan_desa && business.kelurahan_desa.toLowerCase().includes(q)) ||
        (business.kecamatan && business.kecamatan.toLowerCase().includes(q))
      );
    }

    // Apply other filters
    if (filters.jenis_peta !== 'all') {
      filtered = filtered.filter(business => business.jenis_peta === filters.jenis_peta);
    }
    if (filters.kbli_kategori !== 'all') {
      filtered = filtered.filter(business => business.kbli_kategori === filters.kbli_kategori);
    }
    if (filters.kabupaten_kota !== 'all') {
      filtered = filtered.filter(business => business.kabupaten_kota === filters.kabupaten_kota);
    }
    if (filters.kecamatan !== 'all') {
      filtered = filtered.filter(business => business.kecamatan === filters.kecamatan);
    }
    if (filters.kelurahan_desa !== 'all') {
      filtered = filtered.filter(business => business.kelurahan_desa === filters.kelurahan_desa);
    }
    if (filters.sls !== 'all') {
      filtered = filtered.filter(business => String(business.sls) === filters.sls);
    }
    if (filters.sumber_data !== 'all') {
      filtered = filtered.filter(business => business.sumber_data === filters.sumber_data);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredBusinesses(filtered);
    setCurrentPage(1);
  }, [searchTerm, filters, sortField, sortDirection, businesses]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // reset semua filter
  const resetFilters = () => {
    setFilters({
      jenis_peta: 'all',
      kbli_kategori: 'all',
      kabupaten_kota: 'all',
      kecamatan: 'all',
      kelurahan_desa: 'all',
      sls: 'all',
      sumber_data: 'all'
    });
    setCurrentPage(1);
  };
  
  // hirarki: smaller filters disabled until parent selected
  const isFilterDisabled = (key: keyof Filters) => {
    if (key === 'jenis_peta') return false;
    if (key === 'sumber_data' && filters.jenis_peta !== 'prelist') return true;
    if (key === 'kbli_kategori' && filters.jenis_peta === 'all') return true;
    if (key === 'kabupaten_kota' && filters.kbli_kategori === 'all') return true;
    if (key === 'kecamatan' && filters.kabupaten_kota === 'all') return true;
    if (key === 'kelurahan_desa' && filters.kecamatan === 'all') return true;
    if (key === 'sls' && filters.kelurahan_desa === 'all') return true;
    return false;
  };

  const exportToCSV = () => {
    const headers = [
      'No',
      'Nama Usaha',
      'Alamat',
      'Jenis Peta',
      'Kategori KBLI',
      'Kode KBLI',
      'Kabupaten/Kota',
      'Kecamatan',
      'Kelurahan/Desa',
      'SLS',
      'Blok Sensus',
      'Latitude',
      'Longitude',
      'Sumber Data'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredBusinesses.map((business, index) => [
        index + 1,
        `"${business.nama_usaha}"`,
        `"${business.alamat}"`,
        `"${business.jenis_peta}"`,
        `"${business.kbli_kategori}"`,
        business.kbli_kode,
        `"${business.kabupaten_kota}"`,
        `"${business.kecamatan}"`,
        `"${business.kelurahan_desa}"`,
        `"${business.sls}"`,
        `"${business.blok_sensus}"`,
        business.coordinates[0],
        business.coordinates[1],
        `"${business.sumber_data}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `data-usaha-medan-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getJenisPetaColor = (jenis: string) => {
    return jenis === 'listing' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-blue-100 text-blue-800';
  };

  const getUniqueValues = (field: keyof Business): string[] => {
    const values: string[] = [];
    businesses.forEach(b => {
      const value = String(b[field]);
      if (value && value !== 'undefined' && value !== 'null') {
        values.push(value);
      }
    });
    return Array.from(new Set(values)).sort();
  };

  const totalPages = Math.ceil(filteredBusinesses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBusinesses = filteredBusinesses.slice(startIndex, endIndex);

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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="bg-orange-600 p-2 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Export Tabel Dinamis</h1>
                <p className="text-sm sm:text-base text-gray-600">Data usaha Kota Medan dalam format tabel</p>
              </div>
            </div>
            <Button 
              onClick={exportToCSV}
              className="bg-orange-600 hover:bg-orange-700 text-white self-start sm:self-auto"
              size={window.innerWidth < 640 ? "sm" : "default"}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Pencarian terpisah dari filter */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Cari nama usaha, SLS, Kelurahan/Desa, atau Kecamatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filter</span>
              </CardTitle>
              <Button
                onClick={() => setFilterOpen(!filterOpen)}
                variant="outline"
                size="sm"
                className="md:hidden"
              >
                {filterOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className={`${filterOpen ? 'block' : 'hidden md:block'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
              <Select 
                value={filters.jenis_peta} 
                onValueChange={(value) => updateFilter('jenis_peta', value)}
              >
                <SelectTrigger className="text-sm transition-all duration-150 ease-out">
                  <SelectValue placeholder="Jenis Peta" />
                </SelectTrigger>
                <SelectContent className="max-h-56 overflow-y-auto transition-all duration-150">
                  <SelectItem value="all">Semua Jenis Peta</SelectItem>
                  {getUniqueValues('jenis_peta').map(jenis => (
                    <SelectItem key={jenis} value={jenis}>{jenis}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sumber Data filter */}
              <Select 
                value={filters.sumber_data} 
                onValueChange={(value) => updateFilter('sumber_data', value)}
                disabled={isFilterDisabled('sumber_data')}
              >
                 <SelectTrigger className="text-sm">
                   <SelectValue placeholder="Sumber Data" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">Semua Sumber Data</SelectItem>
                   {getUniqueValues('sumber_data').map(sumber => (
                     <SelectItem key={sumber} value={sumber}>{sumber}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>

              <Select 
                value={filters.kbli_kategori} 
                onValueChange={(value) => updateFilter('kbli_kategori', value)}
                disabled={isFilterDisabled('kbli_kategori')}
              >
                 <SelectTrigger className="text-sm">
                   <SelectValue placeholder="Kategori KBLI" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">Semua Kategori</SelectItem>
                   {getUniqueValues('kbli_kategori').map(kategori => (
                     <SelectItem key={kategori} value={kategori} className="text-sm">{kategori}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>

               <Select 
                value={filters.kabupaten_kota} 
                onValueChange={(value) => updateFilter('kabupaten_kota', value)}
                disabled={isFilterDisabled('kabupaten_kota')}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Kabupaten/Kota" />
                </SelectTrigger>
                <SelectContent className="max-h-56 overflow-y-auto">
                  <SelectItem value="all">Semua Kabupaten/Kota</SelectItem>
                  {getUniqueValues('kabupaten_kota').map(kab => (
                    <SelectItem key={kab} value={kab}>{kab}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select 
                value={filters.kecamatan} 
                onValueChange={(value) => updateFilter('kecamatan', value)}
                disabled={isFilterDisabled('kecamatan')}
              >
                 <SelectTrigger className="text-sm">
                   <SelectValue placeholder="Kecamatan" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">Semua Kecamatan</SelectItem>
                   {getUniqueValues('kecamatan').map(kecamatan => (
                     <SelectItem key={kecamatan} value={kecamatan}>{kecamatan}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>

               <Select 
                value={filters.kelurahan_desa} 
                onValueChange={(value) => updateFilter('kelurahan_desa', value)}
                disabled={isFilterDisabled('kelurahan_desa')}
              >
                 <SelectTrigger className="text-sm">
                   <SelectValue placeholder="Kelurahan/Desa" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">Semua Kelurahan/Desa</SelectItem>
                   {getUniqueValues('kelurahan_desa').map(kelurahan => (
                     <SelectItem key={kelurahan} value={kelurahan}>{kelurahan}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>

               {/* SLS filter */}
               <Select 
                value={filters.sls} 
                onValueChange={(value) => updateFilter('sls', value)}
                disabled={isFilterDisabled('sls')}
              >
                 <SelectTrigger className="text-sm">
                   <SelectValue placeholder="SLS" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">Semua SLS</SelectItem>
                   {getUniqueValues('sls').map(s => (
                     <SelectItem key={s} value={s}>{s}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>


             </div>
             <div className="mt-4 flex items-center justify-between gap-2">
              <div className="text-xs sm:text-sm text-gray-600">
                Menampilkan <strong>{filteredBusinesses.length}</strong> dari <strong>{businesses.length}</strong> usaha
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={resetFilters}>Reset</Button>
              </div>
            </div>
           </CardContent>
         </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 sm:w-16 text-xs sm:text-sm">No</TableHead>
                    <TableHead className="min-w-48">
                      <Button
                        variant="ghost"
                        className="h-auto p-0 font-semibold text-xs sm:text-sm"
                        onClick={() => handleSort('nama_usaha')}
                      >
                        Nama Usaha
                        <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="hidden sm:table-cell min-w-64">Alamat</TableHead>
                    <TableHead className="min-w-24">
                      <Button
                        variant="ghost"
                        className="h-auto p-0 font-semibold text-xs sm:text-sm"
                        onClick={() => handleSort('jenis_peta')}
                      >
                        Jenis
                        <ArrowUpDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="hidden lg:table-cell min-w-48">
                      <Button
                        variant="ghost"
                        className="h-auto p-0 font-semibold text-xs sm:text-sm"
                        onClick={() => handleSort('kbli_kategori')}
                      >
                        Kategori KBLI
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="hidden md:table-cell text-xs sm:text-sm">
                      Kecamatan
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </TableHead>
                    <TableHead className="hidden lg:table-cell text-xs sm:text-sm">
                      Kelurahan/Desa
                    </TableHead>
                    <TableHead className="hidden md:table-cell text-xs sm:text-sm">SLS</TableHead>
                    <TableHead className="hidden lg:table-cell text-xs sm:text-sm">Sumber Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentBusinesses.map((business, index) => (
                    <TableRow key={business.id}>
                      <TableCell className="font-medium text-xs sm:text-sm">
                        {startIndex + index + 1}
                      </TableCell>
                      <TableCell className="font-medium text-xs sm:text-sm">
                        <div>
                          <div className="font-medium">{business.nama_usaha}</div>
                          <div className="sm:hidden text-xs text-gray-500 mt-1 truncate max-w-48">
                            {business.alamat}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs sm:text-sm max-w-64">
                        <div className="truncate" title={business.alamat}>
                          {business.alamat}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getJenisPetaColor(business.jenis_peta)}`}>
                          {business.jenis_peta}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs sm:text-sm">{business.kbli_kategori}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs sm:text-sm">{business.kecamatan}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs sm:text-sm">{business.kelurahan_desa}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs sm:text-sm">{business.sls}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs sm:text-sm">{business.sumber_data}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
              Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredBusinesses.length)} dari {filteredBusinesses.length} data
            </p>
            <div className="flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="text-xs sm:text-sm"
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline ml-1">Sebelumnya</span>
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNumber = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i;
                  if (pageNumber > totalPages) return null;
                  
                  return (
                    <Button
                      key={pageNumber}
                      variant={currentPage === pageNumber ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNumber)}
                      className="w-8 h-8 p-0 text-xs sm:text-sm"
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="text-xs sm:text-sm"
              >
                <span className="hidden sm:inline mr-1">Selanjutnya</span>
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
