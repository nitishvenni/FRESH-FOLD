import { useEffect } from "react";

export default function CursorGlow() {
  useEffect(() => {
    const glow = document.createElement("div");
    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    glow.className = "cursor-glow";
    glow.style.opacity = "0";
    document.body.appendChild(glow);

    const animate = () => {
      currentX += (targetX - currentX) * 0.2;
      currentY += (targetY - currentY) * 0.2;
      glow.style.transform = `translate3d(${currentX - 150}px, ${currentY - 150}px, 0)`;
      frame = window.requestAnimationFrame(animate);
    };

    const handleMove = (event: MouseEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      glow.style.opacity = "1";
      if (!frame) {
        frame = window.requestAnimationFrame(animate);
      }
    };

    const handleLeave = () => {
      glow.style.opacity = "0";
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    window.addEventListener("mouseout", handleLeave);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseout", handleLeave);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      glow.remove();
    };
  }, []);

  return null;
}
