import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Map, FileSpreadsheet, AlertCircle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-8 sm:pt-12 pb-6 sm:pb-8 px-6">
          <div className="bg-red-100 p-3 sm:p-4 rounded-full w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-red-600" />
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">404</h1>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-4">Halaman Tidak Ditemukan</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 px-2">
            Maaf, halaman yang Anda cari tidak dapat ditemukan. Silakan kembali ke halaman utama atau 
            gunakan navigasi di bawah ini.
          </p>
          
          <div className="space-y-3">
            <Link to="/peta-usaha" className="block">
              <Button className="w-full bg-orange-600 hover:bg-orange-700 text-sm sm:text-base">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali ke Peta Usaha
              </Button>
            </Link>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link to="/peta-usaha">
                <Button variant="outline" className="w-full text-xs sm:text-sm">
                  <Map className="h-4 w-4 mr-2" />
                  Peta Usaha
                </Button>
              </Link>
              
              <Link to="/export-tabel">
                <Button variant="outline" className="w-full text-xs sm:text-sm">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Tabel
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
