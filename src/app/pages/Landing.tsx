import { Link } from 'react-router';
import talaLogo from '../../public/Tala_Logo.png';

// Developer audit note
// 1. A dedicated landing page already exists: Missing
// 2. The root route already points to a landing page: Missing
// 3. Diagnose is currently the first meaningful page: Already implemented
// 4. Shared logo usage already exists: Already implemented
// 5. A simple CTA route into the app is already implemented: Missing
// 6. A landing page can be added without breaking the current dashboard flow: Already implemented

export function Landing() {
  return (
    <div className="min-h-screen w-full bg-[#EBF4FB] px-6">
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center text-center">
        <img src={talaLogo} alt="TALA" className="h-24 w-auto sm:h-28" />

        <h1
          className="mt-6 text-4xl font-bold sm:text-5xl"
          style={{
            fontFamily: 'Arial, sans-serif',
            color: '#1B3A5C',
          }}
        >
          TALA
        </h1>

        <p className="mt-2 text-base sm:text-lg" style={{ fontFamily: 'Arial, sans-serif', color: '#2E6DA4' }}>
          Teacher Analytics and Localized Action
        </p>

        <p className="mt-4 max-w-2xl text-sm sm:text-base" style={{ fontFamily: 'Arial, sans-serif', color: '#4A5F77' }}>
          STAR&apos;s planning intelligence layer for data-driven teacher targeting
        </p>

        <Link
          to="/diagnose"
          className="mt-8 inline-flex items-center justify-center rounded-md bg-[#1B3A5C] px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-[#2E6DA4]"
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          Enter Dashboard
        </Link>

        <p className="mt-4 text-xs tracking-wide" style={{ fontFamily: 'Arial, sans-serif', color: '#73859B' }}>
          Integrate. Diagnose. Advise.
        </p>
      </main>
    </div>
  );
}