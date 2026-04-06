import { Link } from "react-router";
import { Home } from "lucide-react";

export function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center p-8">
        <div
          className="mb-4"
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: "72px",
            fontWeight: "bold",
            color: "#2E6DA4",
          }}
        >
          404
        </div>
        <h1
          className="mb-2"
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: "24px",
            fontWeight: "bold",
            color: "#1B3A5C",
          }}
        >
          Page Not Found
        </h1>
        <p
          className="mb-6"
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: "11px",
            color: "#888888",
          }}
        >
          The page you're looking for doesn't exist or has been
          moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded bg-[#2E6DA4] text-white hover:bg-[#1B3A5C] transition-colors"
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: "10px",
            fontWeight: "bold",
          }}
        >
          <Home className="w-4 h-4" />
          Back to Overview
        </Link>
      </div>
    </div>
  );
}