import Navigation from './Navigation';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    // 1. Ubah 'min-h-screen' menjadi 'h-screen' pada div terluar
    // Ini memaksa container mengambil tinggi viewport secara eksak (100vh) dan mencegah scroll global.
    <div className="h-screen bg-gray-50 ios-safe-area android-nav-fix">
      <Navigation />
      
      {/* 2. Ubah 'min-h' menjadi 'h' dan tambahkan 'overflow-y-auto' 
          Ini memastikan main mengambil TINGGI EKSESK (h) yang tersisa (100vh - 6rem)
          dan hanya konten di dalamnya yang bisa discroll jika melebihi tinggi tersebut. */}
      <main className="h-[calc(100vh-6rem)] sm:h-[calc(100vh-6rem)] overflow-y-auto">
        {children}
      </main>
      
      {/* Footer singkat (2rem atau h-8) */}
      <footer className="h-8 flex items-center justify-center text-center text-xs text-gray-500 bg-gray-100 border-t border-gray-200">
        BPS Kota Medan | Data terakhir diambil bulan September 2025
      </footer>
    </div>
  );
}