import type { RefObject } from "react";

export type RobotArmRefs = {
  rigWrapperRef: RefObject<HTMLDivElement>;
  upperArmRef: RefObject<SVGGElement>;
  forearmRef: RefObject<SVGGElement>;
  clawLeftRef: RefObject<SVGGElement>;
  clawRightRef: RefObject<SVGGElement>;
  beltSquareRef: RefObject<SVGRectElement>;
  beltCircleRef: RefObject<SVGCircleElement>;
  beltTriangleRef: RefObject<SVGPolygonElement>;
};

type RobotArmSceneProps = RobotArmRefs & {
  isMobile: boolean;
};

export default function RobotArmScene({
  isMobile,
  rigWrapperRef,
  upperArmRef,
  forearmRef,
  clawLeftRef,
  clawRightRef,
  beltSquareRef,
  beltCircleRef,
  beltTriangleRef,
}: RobotArmSceneProps) {
  return (
    <div ref={rigWrapperRef} className="flex justify-center">
      <svg
        viewBox="0 0 240 240"
        aria-hidden="true"
        className="h-40 w-40 md:h-72 md:w-72"
      >
        {/* Cinta transportadora */}
        <rect
          x="10"
          y="196"
          width="220"
          height="14"
          rx="7"
          className="fill-surface stroke-brand-primary/40"
          strokeWidth={2}
        />
        <circle cx="30" cy="203" r="5" className="fill-border/20" />
        <circle cx="120" cy="203" r="5" className="fill-border/20" />
        <circle cx="210" cy="203" r="5" className="fill-border/20" />

        {/* Figuras sobre la cinta */}
        {!isMobile && (
          <rect
            ref={beltSquareRef}
            x="163"
            y="170"
            width="26"
            height="26"
            rx="5"
            className="fill-brand-projects stroke-heading/10"
            strokeWidth={2}
          />
        )}
        <circle
          ref={beltCircleRef}
          cx="128"
          cy="182"
          r="14"
          className="fill-brand-primary stroke-heading/10"
          strokeWidth={2}
        />
        {!isMobile && (
          <polygon
            ref={beltTriangleRef}
            points="66,196 81,168 96,196"
            className="fill-brand-skills stroke-heading/10"
            strokeWidth={2}
          />
        )}

        {/* Brazo robótico: un solo color base (brand-primary) en todos los
            segmentos y articulaciones. Cada círculo de articulación es más
            grande que la mitad del grosor del segmento que conecta, para
            que el segmento nunca "se despegue" del punto de anclaje sin
            importar el ángulo de rotación. Cada <g> pivota sobre su propio
            origen local (0,0), heredado de la traslación del padre. */}
        <g transform="translate(55,196)">
          <rect x="-30" y="-6" width="60" height="22" rx="8" className="fill-heading/70" />
          <circle r="16" className="fill-brand-primary" />

          <g ref={upperArmRef}>
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="-78"
              className="stroke-brand-primary"
              strokeWidth={18}
              strokeLinecap="round"
            />
            <g transform="translate(0,-78)">
              <circle r="14" className="fill-brand-primary" />

              <g ref={forearmRef}>
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="-62"
                  className="stroke-brand-primary"
                  strokeWidth={15}
                  strokeLinecap="round"
                />
                <g transform="translate(0,-62)">
                  <circle r="12" className="fill-brand-primary" />

                  <g ref={clawLeftRef}>
                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="-32"
                      className="stroke-brand-primary"
                      strokeWidth={11}
                      strokeLinecap="round"
                    />
                  </g>
                  <g ref={clawRightRef}>
                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="-32"
                      className="stroke-brand-primary"
                      strokeWidth={11}
                      strokeLinecap="round"
                    />
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
