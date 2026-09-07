'use client';

import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

import { getSyntheticDecorMedia } from '../../lib/preview/synthetic-decor-media';
import type { SyntheticExperienceMode } from '../../lib/preview/synthetic-experience';

const INTERACTIVE_POINTER_QUERY =
  '(min-width: 1100px) and (hover: hover) and (pointer: fine)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export default function SyntheticFiligree({
  mode = 'local-preview',
}: {
  mode?: SyntheticExperienceMode;
}) {
  const decorationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const decoration = decorationRef.current;
    const page = decoration?.closest<HTMLElement>('.synthetic-preview-page');
    if (!decoration || !page) return undefined;

    const pointerQuery = window.matchMedia(INTERACTIVE_POINTER_QUERY);
    const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    let animationFrame: number | undefined;
    let latestPointer: PointerEvent | undefined;
    let listening = false;

    const deactivate = () => {
      decoration.dataset.active = 'false';
      latestPointer = undefined;
      if (animationFrame !== undefined) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = undefined;
      }
    };

    const renderPointer = () => {
      animationFrame = undefined;
      if (!latestPointer) return;

      const bounds = decoration.getBoundingClientRect();
      decoration.style.setProperty(
        '--filigree-pointer-x',
        `${latestPointer.clientX - bounds.left}px`,
      );
      decoration.style.setProperty(
        '--filigree-pointer-y',
        `${latestPointer.clientY - bounds.top}px`,
      );
      decoration.dataset.active = 'true';
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      latestPointer = event;
      if (animationFrame === undefined) {
        animationFrame = window.requestAnimationFrame(renderPointer);
      }
    };

    const handleScroll = () => {
      if (latestPointer && animationFrame === undefined) {
        animationFrame = window.requestAnimationFrame(renderPointer);
      }
    };

    const startListening = () => {
      if (listening) return;
      page.addEventListener('pointermove', handlePointerMove, { passive: true });
      page.addEventListener('pointerleave', deactivate);
      page.addEventListener('pointercancel', deactivate);
      window.addEventListener('blur', deactivate);
      window.addEventListener('scroll', handleScroll, { passive: true });
      listening = true;
    };

    const stopListening = () => {
      if (!listening) return;
      page.removeEventListener('pointermove', handlePointerMove);
      page.removeEventListener('pointerleave', deactivate);
      page.removeEventListener('pointercancel', deactivate);
      window.removeEventListener('blur', deactivate);
      window.removeEventListener('scroll', handleScroll);
      listening = false;
      deactivate();
    };

    const synchronizeInteraction = () => {
      if (pointerQuery.matches && !motionQuery.matches) {
        startListening();
      } else {
        stopListening();
      }
    };

    pointerQuery.addEventListener('change', synchronizeInteraction);
    motionQuery.addEventListener('change', synchronizeInteraction);
    synchronizeInteraction();

    return () => {
      stopListening();
      pointerQuery.removeEventListener('change', synchronizeInteraction);
      motionQuery.removeEventListener('change', synchronizeInteraction);
    };
  }, []);

  return (
    <div
      ref={decorationRef}
      className="synthetic-preview-filigree"
      data-active="false"
      style={{
        '--filigree-image': `url('${getSyntheticDecorMedia('border-filigree', mode).desktopUrl}')`,
      } as CSSProperties}
      aria-hidden="true"
    />
  );
}
