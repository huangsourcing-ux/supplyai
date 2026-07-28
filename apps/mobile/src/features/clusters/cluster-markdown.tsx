import { Fragment, type ReactNode } from "react";
import {
  Image,
  Linking,
  StyleSheet,
  Text,
  type TextStyle,
  View,
} from "react-native";
import { fromMarkdown } from "mdast-util-from-markdown";

type MarkdownNode = {
  alt?: string | null;
  children?: MarkdownNode[];
  depth?: number;
  ordered?: boolean | null;
  start?: number | null;
  type: string;
  url?: string;
  value?: string;
};

function safeHttpUrl(value: string | undefined): string | null {
  if (value === undefined) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function inlineChildren(node: MarkdownNode, path: string): ReactNode[] {
  return (node.children ?? []).map((child, index) =>
    renderInline(child, `${path}-${index}`),
  );
}

function renderInline(node: MarkdownNode, path: string): ReactNode {
  switch (node.type) {
    case "break":
      return "\n";
    case "delete":
      return (
        <Text key={path} style={styles.delete}>
          {inlineChildren(node, path)}
        </Text>
      );
    case "emphasis":
      return (
        <Text key={path} style={styles.emphasis}>
          {inlineChildren(node, path)}
        </Text>
      );
    case "html":
      return null;
    case "image":
    case "imageReference":
      return node.alt ?? "";
    case "inlineCode":
      return (
        <Text key={path} style={styles.inlineCode}>
          {node.value ?? ""}
        </Text>
      );
    case "link": {
      const url = safeHttpUrl(node.url);
      if (url === null) {
        return <Fragment key={path}>{inlineChildren(node, path)}</Fragment>;
      }

      return (
        <Text
          accessibilityRole="link"
          key={path}
          onPress={() => {
            void Linking.openURL(url).catch(() => undefined);
          }}
          style={styles.link}
        >
          {inlineChildren(node, path)}
        </Text>
      );
    }
    case "linkReference":
    case "strong":
      return (
        <Text key={path} style={node.type === "strong" ? styles.strong : null}>
          {inlineChildren(node, path)}
        </Text>
      );
    case "text":
      return node.value ?? "";
    default:
      return node.children === undefined ? null : (
        <Fragment key={path}>{inlineChildren(node, path)}</Fragment>
      );
  }
}

function headingStyle(depth: number | undefined): TextStyle {
  switch (depth) {
    case 1:
      return styles.heading1;
    case 2:
      return styles.heading2;
    default:
      return styles.heading3;
  }
}

function renderParagraph(
  node: MarkdownNode,
  path: string,
  imageFallbackAlt: string,
): ReactNode {
  const children = node.children ?? [];
  const hasImage = children.some((child) => child.type === "image");

  if (!hasImage) {
    return (
      <Text key={path} style={styles.paragraph}>
        {inlineChildren(node, path)}
      </Text>
    );
  }

  const rendered: ReactNode[] = [];
  let inlineGroup: MarkdownNode[] = [];
  const flushInlineGroup = (suffix: string) => {
    if (inlineGroup.length === 0) return;
    rendered.push(
      <Text key={`${path}-text-${suffix}`} style={styles.paragraph}>
        {inlineGroup.map((child, index) =>
          renderInline(child, `${path}-text-${suffix}-${index}`),
        )}
      </Text>,
    );
    inlineGroup = [];
  };

  children.forEach((child, index) => {
    if (child.type !== "image") {
      inlineGroup.push(child);
      return;
    }

    flushInlineGroup(String(index));
    const url = safeHttpUrl(child.url);
    const alt = child.alt?.trim() || imageFallbackAlt;
    rendered.push(
      url === null ? (
        <Text key={`${path}-image-${index}`} style={styles.paragraph}>
          {alt}
        </Text>
      ) : (
        <Image
          accessibilityLabel={alt}
          accessible
          key={`${path}-image-${index}`}
          resizeMode="cover"
          source={{ uri: url }}
          style={styles.image}
        />
      ),
    );
  });
  flushInlineGroup("last");

  return <View key={path}>{rendered}</View>;
}

function renderBlock(
  node: MarkdownNode,
  path: string,
  imageFallbackAlt: string,
): ReactNode {
  switch (node.type) {
    case "blockquote":
      return (
        <View key={path} style={styles.blockquote}>
          {(node.children ?? []).map((child, index) =>
            renderBlock(child, `${path}-${index}`, imageFallbackAlt),
          )}
        </View>
      );
    case "code":
      return (
        <View key={path} style={styles.codeBlock}>
          <Text selectable style={styles.codeText}>
            {node.value ?? ""}
          </Text>
        </View>
      );
    case "definition":
    case "html":
      return null;
    case "heading":
      return (
        <Text
          accessibilityRole="header"
          key={path}
          style={[styles.heading, headingStyle(node.depth)]}
        >
          {inlineChildren(node, path)}
        </Text>
      );
    case "list":
      return (
        <View key={path} style={styles.list}>
          {(node.children ?? []).map((item, index) => (
            <View key={`${path}-${index}`} style={styles.listItem}>
              <Text style={styles.listMarker}>
                {node.ordered === true ? `${(node.start ?? 1) + index}.` : "•"}
              </Text>
              <View style={styles.listContent}>
                {(item.children ?? []).map((child, childIndex) =>
                  renderBlock(
                    child,
                    `${path}-${index}-${childIndex}`,
                    imageFallbackAlt,
                  ),
                )}
              </View>
            </View>
          ))}
        </View>
      );
    case "paragraph":
      return renderParagraph(node, path, imageFallbackAlt);
    case "thematicBreak":
      return <View key={path} style={styles.thematicBreak} />;
    default:
      return node.children === undefined ? null : (
        <View key={path}>
          {node.children.map((child, index) =>
            renderBlock(child, `${path}-${index}`, imageFallbackAlt),
          )}
        </View>
      );
  }
}

export function ClusterMarkdown({
  imageFallbackAlt,
  markdown,
}: Readonly<{
  imageFallbackAlt: string;
  markdown: string;
}>) {
  const tree = fromMarkdown(markdown) as MarkdownNode;

  return (
    <View testID="cluster-markdown">
      {(tree.children ?? []).map((node, index) =>
        renderBlock(node, `markdown-${index}`, imageFallbackAlt),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  blockquote: {
    borderLeftColor: "#99F6E4",
    borderLeftWidth: 4,
    marginBottom: 10,
    paddingLeft: 14,
  },
  codeBlock: {
    backgroundColor: "#0F172A",
    borderRadius: 10,
    marginBottom: 12,
    padding: 14,
  },
  codeText: {
    color: "#E2E8F0",
    fontFamily: "monospace",
    fontSize: 13,
    lineHeight: 20,
  },
  delete: {
    textDecorationLine: "line-through",
  },
  emphasis: {
    fontStyle: "italic",
  },
  heading: {
    color: "#0F172A",
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 8,
  },
  heading1: {
    fontSize: 24,
    lineHeight: 31,
  },
  heading2: {
    fontSize: 20,
    lineHeight: 27,
  },
  heading3: {
    fontSize: 17,
    lineHeight: 24,
  },
  image: {
    backgroundColor: "#E2E8F0",
    borderRadius: 12,
    height: 196,
    marginBottom: 14,
    width: "100%",
  },
  inlineCode: {
    backgroundColor: "#E2E8F0",
    color: "#334155",
    fontFamily: "monospace",
    fontSize: 14,
  },
  link: {
    color: "#0F766E",
    textDecorationLine: "underline",
  },
  list: {
    marginBottom: 10,
  },
  listContent: {
    flex: 1,
  },
  listItem: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  listMarker: {
    color: "#0F766E",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 24,
    width: 24,
  },
  paragraph: {
    color: "#334155",
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 12,
  },
  strong: {
    color: "#1E293B",
    fontWeight: "800",
  },
  thematicBreak: {
    backgroundColor: "#CBD5E1",
    height: StyleSheet.hairlineWidth,
    marginBottom: 16,
    marginTop: 4,
  },
});
