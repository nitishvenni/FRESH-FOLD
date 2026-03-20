export default function Skeleton({
  height = 80,
  radius = 16,
}: {
  height?: number;
  radius?: number;
}) {
  return (
    <div
      style={{
        height,
        width: "100%",
        borderRadius: radius,
        background: "linear-gradient(90deg, rgba(17,17,17,0.85), rgba(38,38,38,0.9), rgba(17,17,17,0.85))",
        backgroundSize: "200% 100%",
        animation: "skeleton 1.2s linear infinite",
      }}
    />
  );
}
