'use client';

import dynamic from "next/dynamic";
import { Loader } from "rsuite";

const SchemaBuilder = dynamic(() => import("./SchemaBuilder"), {
  ssr: false,
  loading: () => (
    <div className="sb-loading">
      <Loader size="lg" />
    </div>
  ),
});

export default function SchemaBuilderClient() {
  return <SchemaBuilder />;
}
