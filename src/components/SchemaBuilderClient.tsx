'use client';

import dynamic from "next/dynamic";
import { Loader } from "rsuite";
import type { SchemaBuilderProps } from "@/types/builder";

const SchemaBuilder = dynamic(() => import("./SchemaBuilder"), {
  ssr: false,
  loading: () => (
    <div className="sb-loading">
      <Loader size="lg" />
    </div>
  ),
});

export default function SchemaBuilderClient(props: SchemaBuilderProps) {
  return <SchemaBuilder {...props} />;
}
