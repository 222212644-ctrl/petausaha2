import Navigation from './Navigation';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 ios-safe-area android-nav-fix">
      <Navigation />
      <main className="min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </div>
  );
}
