import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Map, 
  FileSpreadsheet, 
  TrendingUp, 
  Users, 
  MapPin,
  ArrowRight,
  BarChart3,
  Calendar
} from 'lucide-react';

interface Business {
  id: string;
  name: string;
  category: string;
  address: string;
  owner: string;
  phone: string;
  established: string;
  employees: number;
  revenue_range: string;
}

export default function Index() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load geojson data
    fetch('/geojson/businesses-medan.geojson')
      .then(response => response.json())
      .then(data => {
        const businessData = data.features.map((feature: any) => feature.properties);
        setBusinesses(businessData);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading business data:', error);
        setLoading(false);
      });
  }, []);

  const categories = Array.from(new Set(businesses.map(b => b.category)));
  const totalEmployees = businesses.reduce((sum, b) => sum + b.employees, 0);
  const avgEmployees = Math.round(totalEmployees / businesses.length) || 0;

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Kuliner': 'bg-orange-100 text-orange-800',
      'Elektronik': 'bg-blue-100 text-blue-800',
      'Otomotif': 'bg-gray-100 text-gray-800',
      'Jasa': 'bg-green-100 text-green-800',
      'Fashion': 'bg-pink-100 text-pink-800',
      'Kesehatan': 'bg-red-100 text-red-800',
      'Teknologi': 'bg-purple-100 text-purple-800',
      'Material': 'bg-yellow-100 text-yellow-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data usaha...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Pemetaan Usaha
                <span className="block text-orange-200">Kota Medan</span>
              </h1>
              <p className="text-xl text-orange-100 mb-8 max-w-3xl mx-auto">
                Sistem informasi geografis untuk pemetaan dan dokumentasi daftar usaha resmi 
                di Kota Medan dengan teknologi modern dan data yang akurat.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/peta-usaha">
                  <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 font-semibold">
                    <Map className="h-5 w-5 mr-2" />
                    Lihat Peta Usaha
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </Link>
                <Link to="/export-tabel">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-orange-600 font-semibold">
                    <FileSpreadsheet className="h-5 w-5 mr-2" />
                    Export Data
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg className="wave-top" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" fill="#ffffff"></path>
          </svg>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-orange-400 to-orange-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Total Usaha</p>
                  <p className="text-3xl font-bold">{businesses.length}</p>
                </div>
                <Building2 className="h-10 w-10 text-orange-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-400 to-amber-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">Kategori Usaha</p>
                  <p className="text-3xl font-bold">{categories.length}</p>
                </div>
                <BarChart3 className="h-10 w-10 text-amber-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-400 to-red-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium">Total Karyawan</p>
                  <p className="text-3xl font-bold">{totalEmployees}</p>
                </div>
                <Users className="h-10 w-10 text-red-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm font-medium">Rata-rata Karyawan</p>
                  <p className="text-3xl font-bold">{avgEmployees}</p>
                </div>
                <TrendingUp className="h-10 w-10 text-yellow-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <Card className="bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="bg-orange-500 p-2 rounded-lg">
                  <Map className="h-6 w-6 text-white" />
                </div>
                <span>Peta Usaha Interaktif</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Jelajahi peta interaktif untuk melihat lokasi usaha di Kota Medan dengan informasi lengkap 
                seperti kategori, alamat, dan data pemilik.
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-500">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>Berbasis Koordinat GPS</span>
                </div>
                <Link to="/peta-usaha">
                  <Button variant="outline" size="sm">
                    Lihat Peta
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="bg-amber-500 p-2 rounded-lg">
                  <FileSpreadsheet className="h-6 w-6 text-white" />
                </div>
                <span>Export Data Dinamis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Akses data usaha dalam format tabel dengan fitur pencarian, filter, dan export ke CSV 
                untuk analisis lebih lanjut.
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>Data Real-time</span>
                </div>
                <Link to="/export-tabel">
                  <Button variant="outline" size="sm">
                    Lihat Tabel
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Distribution */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <BarChart3 className="h-6 w-6 text-orange-600" />
              <span>Distribusi Kategori Usaha</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map(category => {
                const count = businesses.filter(b => b.category === category).length;
                const percentage = ((count / businesses.length) * 100).toFixed(1);
                
                return (
                  <div key={category} className="text-center p-4 rounded-lg bg-gray-50">
                    <Badge className={`${getCategoryColor(category)} mb-2`}>
                      {category}
                    </Badge>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-sm text-gray-500">{percentage}%</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <style>{`
        .wave-top {
          height: 60px;
          width: 100%;
        }
      `}</style>
    </div>
  );
}
