"use client";

import dynamic from "next/dynamic";

const Index = dynamic(() => import("@/views/Index"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
      <p>Chargement...</p>
    </div>
  ),
});

export default function HomePage() {
  return <Index />;
}
