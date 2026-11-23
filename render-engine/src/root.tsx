import React from "react";
import {Composition} from "remotion";
import {Capsule, type HdCapsuleProps, sampleProps, dimensionsFor} from "./capsule";

export const Root:React.FC=()=>(
  <Composition
    id="DomSoucyCapsuleHD"
    component={Capsule}
    fps={30}
    durationInFrames={900}
    width={1920}
    height={1080}
    defaultProps={sampleProps}
    calculateMetadata={({props})=>{
      const data=props as HdCapsuleProps;
      const size=dimensionsFor(data.format);
      return {
        fps:30,width:size.width,height:size.height,
        durationInFrames:Math.max(1,Math.round((data.end-data.start)*30)),
      };
    }}
  />
);
