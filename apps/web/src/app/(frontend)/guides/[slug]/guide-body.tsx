import {
  RichText,
  type JSXConverterArgs,
  type JSXConvertersFunction,
} from "@payloadcms/richtext-lexical/react";
import Link from "next/link";
import React from "react";

import type { PublishedCluster } from "@/cms/published-clusters";
import type { Article } from "@/payload-types";

interface GuideBodyProps {
  body: Article["body"];
  clusters: ReadonlyMap<string, PublishedCluster>;
  labels: Readonly<{
    factoryCount: (count: number) => string;
    unavailable: string;
    viewCluster: string;
  }>;
}

interface ClusterCardNode {
  fields: {
    blockType: "clusterCard";
    clusterId?: unknown;
  };
  type: "block";
}

export function GuideBody({ body, clusters, labels }: GuideBodyProps) {
  const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
    ...defaultConverters,
    blocks: {
      clusterCard: ({ node }: JSXConverterArgs<ClusterCardNode>) => {
        const clusterId = node.fields.clusterId;
        const cluster =
          typeof clusterId === "string" ? clusters.get(clusterId) : undefined;

        if (!cluster) {
          return (
            <aside className="guide-cluster-card guide-cluster-card--unavailable">
              {labels.unavailable}
            </aside>
          );
        }

        return (
          <aside
            className="guide-cluster-card"
            style={{ "--cluster-color": cluster.color } as React.CSSProperties}
          >
            <div>
              <strong>{cluster.name}</strong>
              <span>{labels.factoryCount(cluster.factoryCount)}</span>
            </div>
            <Link href={`/clusters/${cluster.slug}`}>{labels.viewCluster}</Link>
          </aside>
        );
      },
    },
  });

  return <RichText converters={converters} data={body} />;
}
