// Original spatial algorithms. Each body returns an RGB color using the shared palette.
export const algorithms: Record<string, string> = {
  // Color pools grow richer and their boundaries flow more.
  chroma: `vec2 q=p*.85; q+=vec2(sin(q.y*2.1+t*.11),cos(q.x*1.8-t*.09))*intensity(.04,.18,.38); float a=.5+.5*sin(q.x*2.3+q.y*1.6+t*.08); float b=exp(-dot(q-vec2(.55*sin(t*.07),-.4),q-vec2(.55*sin(t*.07),-.4))*2.3); return mix(mix(pal(0.),pal(1.),smoothstep(intensity(-.2,.12,.3),intensity(1.2,.9,.72),a)),pal(2.),b*intensity(.3,.85,1.));`,
  // Column offsets and the dark transition seams become more pronounced.
  relay: `float column=floor(p.x*3.2); float phase=sin(column*2.17+u_seed)*intensity(.12,.6,1.15)+sin(t*.12+column)*intensity(.04,.18,.35); float y=p.y-phase; vec3 upper=mix(pal(0.),pal(1.),.5+.5*sin(column*2.4)); vec3 lower=mix(pal(2.),pal(3.),.5+.5*cos(column*1.7)); vec3 c=mix(lower,upper,smoothstep(-.28,.22,y)); float seam=exp(-pow((y+.13)*7.,2.)); return mix(c,pal(4.),seam*intensity(.12,.65,.95));`,
  // The luminous corona broadens and its crest rises.
  corona: `float f=p.y+intensity(.12,.52,.9)*sin(p.x*1.7+t*.12)+intensity(.03,.18,.32)*cos(p.x*3.1-t*.07); float width=intensity(.07,.23,.45)+u_softness*.12; vec3 base=mix(pal(3.),pal(0.),smoothstep(-.55,.5,f)); base=mix(base,pal(0.),smoothstep(.6,1.8,length(p))*.35); vec3 edge=palette(clamp(f/(width*2.)+.5,0.,1.)); float band=1.-smoothstep(width,width+.07,abs(f)); return mix(base,edge,band);`,
  // The spectral ribbon gains bend, body, and surface shading.
  spectrum: `float curve=intensity(.06,.4,.85)*sin(p.x*1.65+t*.12); float d=p.y-curve; float edge=1.-smoothstep(.265,.28+u_softness*.015,abs(d)/intensity(.5,1.,1.6)); float f=clamp(p.x*.22+.55+sin(t*.08)*.07,.001,.999); float s=1.+f*float(u_paletteCount-2); vec3 c=mix(pal(floor(s)),pal(floor(s)+1.),smoothstep(0.,1.,fract(s))); float relief=intensity(.01,.04,.16); c*=1.-relief+relief*cos(d*8.); return mix(pal(0.),c,edge);`,
  // Liquid color streams curl and interlock more strongly.
  flux: `vec2 q=p*.8; for(int i=0;i<3;i++){float a=float(i);q+=intensity(.06,.42,.72)*vec2(sin(q.y*2.+t*.09+a*.9),sin(q.x*2.6-t*.08+a));} float f=.5+.5*sin(q.x*2.15+q.y*1.2+sin(q.y*2.4)*intensity(.08,.65,1.3)); return palette(f);`,
  // Warm color blooms spread and push into the cobalt field.
  cobalt: `vec2 q=p+vec2(sin(p.y*2.+t*.07),cos(p.x*1.8-t*.08))*intensity(.04,.24,.48); float a=exp(-dot((q-vec2(-.65,.35))*vec2(.75,1.2),(q-vec2(-.65,.35))*vec2(.75,1.2))*1.8); float b=exp(-dot(q-vec2(.5,-.45),q-vec2(.5,-.45))*2.1); vec3 c=mix(pal(0.),pal(1.),smoothstep(intensity(.4,.12,-.1),intensity(1.3,.9,.7),a)); return mix(c,pal(2.),b*intensity(.2,.86,1.));`,
  // Submerged light shafts deepen and the overhead glow strengthens.
  abyss: `vec2 q=p*.85; float f=sin(q.x*1.7+t*.09)*cos(q.y*1.9-t*.07)+intensity(.05,.3,.65)*sin(q.x*3.+q.y*2.); float glow=exp(-dot(q-vec2(.7,.8),q-vec2(.7,.8))*.9); return mix(mix(pal(0.),pal(1.),smoothstep(-.15,.85,f)*intensity(.25,1.,1.)),pal(2.),glow*intensity(.15,.65,.95));`,
  // The radial shadow becomes deeper and more concentrated.
  sundial: `vec2 q=p-vec2(0.,-.12); float angle=atan(q.y,q.x)+t*.025; float f=fract(angle/6.283185+.5); float light=pow(f,intensity(.25,.6,1.4)); return mix(pal(0.),pal(1.),light*intensity(.25,1.,1.));`,
  // Contour paths gain curvature and brighter, thicker strokes.
  isoline: `vec2 q=p*.85; float f=q.x*.55+q.y*.18+intensity(.1,.55,1.)*sin(q.y*2.+t*.07)+intensity(.04,.24,.5)*cos(q.x*2.8-q.y*1.2-t*.05); float v=f*2.6; float d=abs(fract(v+.5)-.5); float aa=max(fwidth(v),.001); float line=1.-smoothstep(aa*intensity(.1,.25,.8),aa*intensity(.7,1.1,2.),d); return mix(pal(0.),pal(1.),line*intensity(.3,.7,1.));`,
  // Terraced rings gain more steps and finely rippled edges.
  terrace: `vec2 q=p-vec2(-.8,.65); float ripple=sin(q.y*45.+q.x*4.-t*.35)*intensity(.002,.025,.065); float radius=length(q*vec2(.82,.62))+ripple; float f=clamp(radius*.56+.05*sin(t*.08),0.,.999); float levels=intensity(6.,14.,28.); float stepValue=floor(f*levels)/levels; return palette(stepValue);`,
  // Fabric-like color folds deepen and crease shadows strengthen.
  lilt: `vec2 q=p*.8; for(int i=0;i<3;i++){q+=intensity(.04,.3,.52)*vec2(sin(q.y*2.1+t*.08),cos(q.x*2.-t*.06));q=mat2(.94,.342,-.342,.94)*q;} float fold=q.y+intensity(.07,.38,.7)*sin(q.x*2.3); float f=.5+.48*sin(fold*2.7); vec3 c=palette(f); float crease=exp(-abs(fold-.28*sin(q.x))*15.); return mix(c,pal(2.),crease*intensity(.03,.3,.65));`,
  // Glass tiles gain refraction, darker seams, and raised highlights; photos stay legible.
  weave: `vec2 grid=p*34.;vec2 cell=fract(grid)-.5;float shimmer=sin(p.x*1.7+p.y*1.3+t*.24);vec2 bend=sin(cell*6.283185)*intensity(0.,.012,.03)*(1.+.35*shimmer);vec3 c;if(u_hasImage>.5){vec2 uv=gl_FragCoord.xy/u_resolution;float ca=u_resolution.x/u_resolution.y;float ia=u_imageSize.x/u_imageSize.y;vec2 fit=vec2(min(ca/ia,1.),min(ia/ca,1.));uv=(uv-.5)*fit+.5;c=texture(u_image,clamp(uv+bend,0.,1.)).rgb;}else{float f=.5+.32*sin(p.x*1.4+t*.08)+.15*cos(p.y*2.-t*.06);c=palette(f);}float edge=max(abs(cell.x),abs(cell.y));float seam=smoothstep(.39,.47,edge);float glint=.06*shimmer;float highlight=exp(-pow((cell.x+.33+glint)*35.,2.))+exp(-pow((cell.y-.33+glint)*35.,2.));float diamond=pow(max(0.,1.-abs(cell.x+cell.y)*1.5),16.)*.06;return c*(1.-seam*intensity(.03,.25,.55))+highlight*intensity(.015,.12,.25)+diamond*intensity(.1,1.,2.);`,
  // Apricity’s warm light pool blooms and its color boundary becomes more organic.
  mesh: `vec2 q=p; float a=fbm(q*1.3+t*.08); vec3 c=mix(pal(0.),pal(1.),smoothstep(-.8,.7,q.x+a*intensity(.1,.7,1.3))); c=mix(c,pal(3.),exp(-length(q-vec2(.45,.45+sin(t*.13)*.15))*intensity(2.8,1.65,1.05))); c=mix(c,pal(0.),smoothstep(.15,1.3,length(q-vec2(-.65,-.45)))*intensity(.03,.18,.35)); return c;`,
  // Silk gains wave height and sculptural shading.
  ribbon: `float y=sin(p.x*2.4+t*.17)*intensity(.04,.34,.75); float d=abs(p.y-y); float edge=1.-smoothstep(.22,.25+u_softness*.05,d); vec3 c=palette(p.x*.35+.5+sin(t*.1)*.06); float relief=intensity(.04,.27,.5); float shading=1.-relief+relief*cos((p.y-y)*7.); return mix(pal(0.),c*shading,edge);`,
  // Water refraction grows more turbulent and its light caustics become stronger.
  caustics: `vec2 q=p*2.2; float c=0.; for(int i=0;i<3;i++){q+=vec2(sin(q.y*1.7+t*.16),cos(q.x*1.5-t*.13))*intensity(.12,.45,.8); c+=pow(.5+.5*sin(q.x*3.+q.y*2.),8.);} return mix(pal(0.),pal(2.),clamp(c*intensity(.1,.45,.9),0.,1.))+.05*fbm(p*3.);`,
  // Vesper’s horizon gains wave height and a more luminous crest.
  wave: `float w=sin(p.x*1.8+t*.13)*intensity(.04,.3,.65)+cos(p.x*.9-t*.1)*intensity(.03,.2,.4); float a=smoothstep(-.35,.5,p.y-w); return mix(mix(pal(0.),pal(1.),a),pal(3.),exp(-pow((p.y-w-.25)*3.,2.))*intensity(.1,.45,.8));`,
  // Bloom’s pigment folds become more turbulent.
  fluid: `vec2 q=p; for(int i=0;i<4;i++){q+=intensity(.025,.24,.48)*vec2(sin(q.y*2.8+t*.16+float(i)),cos(q.x*2.3-t*.12));} return palette(.5+.42*sin(q.x*1.8+q.y*1.4));`,
  // Aurora curtains rise taller and radiate more light.
  aurora: `float field=0.;for(int i=0;i<4;i++){float x=float(i);float y=.1+sin(p.x*(1.3+x*.3)+t*.12+x)*intensity(.07,.35,.7);field+=exp(-abs(p.y-y)*mix(8.,3.,u_softness))*(.3+x*.08)*intensity(.2,1.,1.8);} vec3 c=mix(pal(0.),palette(p.x*.15+.45),clamp(field,0.,1.));return c+pow(max(0.,field-.9),2.)*.12;`,
  // Mist becomes denser, with more prominent overlapping veils.
  fog: `float f=fbm(p*1.4+vec2(t*.08,0.));float g=fbm(p*2.3+vec2(t*.04,-t*.015));return mix(mix(pal(0.),pal(1.),smoothstep(intensity(.35,.1,-.12),intensity(1.,.8,.65),f)),pal(2.),smoothstep(.25,.8,g)*intensity(.18,.7,.95));`,
  // Cloud cover builds from thin patches into a thick, billowing sky.
  clouds: `vec2 q=p*1.5+vec2(t*.025,0.);float f=fbm(q+fbm(q*1.4+vec2(0.,t*.012))*intensity(.2,1.,1.8));float cloud=smoothstep(intensity(.48,.3,.12),intensity(.85,.75,.62),f);float light=fbm(q+vec2(.15,.22));return mix(pal(0.),mix(pal(1.),pal(3.),light),cloud);`,
  // Drift’s organic eddies gain depth and tighter turns.
  perlin: `float f=perlin(p*1.5+vec2(perlin(p*2.+t*.04),perlin(p*2.-t*.03))*intensity(.2,2.,3.8)); return palette(f);`,
  // Strata’s layers buckle and develop irregular edges.
  bands: `float n=fbm(p*2.+t*.04);float y=p.y*.6+sin(p.x*2.+t*.1)*intensity(.03,.3,.65)+n*intensity(.05,.5,1.);float f=.5+.5*sin(y*9.);return palette(f*.8+.1);`,
  // Nectar’s pools expand and merge, with more defined boundaries.
  blobs: `float d=8.;for(int i=0;i<5;i++){float a=float(i)*1.256+t*.07;vec2 center=vec2(cos(a)*.7,sin(a*1.2)*.6);d=min(d,length(p-center)-intensity(.12,.35,.55));}float f=smoothstep(-.2,intensity(.6,.45,.2),d);return mix(palette(p.y*.25+.45),pal(0.),f);`,
  // Pebble’s rounded forms swell and fuse; their rims gain relief.
  metaballs: `float field=0.;for(int i=0;i<5;i++){float a=float(i)*1.27+t*.06;vec2 c=vec2(sin(a*1.3)*.8,cos(a)*.6);field+=intensity(.04,.11,.2)/(dot(p-c,p-c)+.035);}float body=smoothstep(.78,.87,field);float rim=exp(-abs(field-.83)*9.);return mix(pal(0.),mix(pal(1.),pal(2.),clamp(field*.3,0.,1.)),body)+rim*intensity(.01,.07,.15);`,
  // Prism’s glass flutes refract more deeply and catch stronger highlights.
  glass: `float bars=sin(p.x*15.+sin(p.y*2.)*1.2);vec2 q=p+vec2(bars*intensity(.01,.09,.23),0.);vec3 c=palette(.5+.3*sin(q.y*1.8+q.x*.6+t*.04));return c*(1.-intensity(.03,.16,.32)+intensity(.03,.16,.32)*bars)+pow(max(bars,0.),18.)*intensity(.02,.12,.28);`,
  // Spectral’s lens ripples and chromatic dispersion become stronger.
  refraction: `float d=length(p*vec2(.8,1.2));float wave=sin(d*7.-t*.09+fbm(p*2.)*intensity(.2,3.,6.));float f=.5+.5*wave;vec3 c=palette(f);c.r=mix(c.r,palette(f+intensity(0.,.035,.12)).r,.35);c.b=mix(c.b,palette(f-intensity(0.,.035,.12)).b,.35);return mix(pal(0.),c,(1.-smoothstep(.2,1.4,d)));`,
  // Iris’s lens bends the underlying field more strongly and catches a brighter rim.
  lens: `vec2 c=vec2(sin(t*.06)*.2,cos(t*.05)*.15);float d=length(p-c);vec2 q=p+(p-c)*exp(-d*d*3.)*intensity(.08,.8,1.8);vec3 col=palette(.5+.4*sin(q.x*2.+q.y));float rim=exp(-abs(d-.65)*65.);return col*.94+rim*intensity(.02,.16,.35);`,
  // Opal’s interference colors become more layered and pearlescent.
  iridescent: `float f=fbm(p*2.);vec3 c=palette(.5+.45*sin(f*intensity(2.,8.,14.)+p.x*1.2+sin(t*.12)*.55));float light=pow(.5+.5*cos(f*17.+p.y*3.+t*.16),8.);return mix(c,pal(2.),light*intensity(.08,.55,.85));`,
  // Sienna’s warm pigment spot deepens and its gradient bends further.
  editorial: `float f=smoothstep(-.8,.9,p.x*.6+p.y+sin(p.x+t*.03)*intensity(.04,.3,.65));vec3 c=mix(pal(0.),pal(3.),f);float spot=exp(-length((p-vec2(.6,-.2))*vec2(1.2,.7))*2.);return mix(c,pal(1.),spot*intensity(.15,.7,1.));`,
  // Cutout’s graphic color boundaries gain stronger, sweeping curves.
  poster: `float w=sin(p.x*1.5+t*.07)*intensity(.03,.4,.9);float f=clamp((p.y-w)*.55+.5,0.,.999);return pal(floor(f*float(u_paletteCount)));`,
  // Riso increases ink coverage through larger dots, keeping the print grid stable.
  halftone: `vec2 q=p*25.;vec2 cell=floor(q);float f=.5+.5*sin(cell.x*.08+cell.y*.1+t*.1);float radius=intensity(.02,.08,.14)+intensity(.13,.35,.46)*f;float dotField=1.-smoothstep(radius-.025,radius+.025,length(fract(q)-.5));return mix(pal(0.),pal(1.),dotField);`,
  // Signal’s points grow and shine more brightly, keeping the dot grid stable.
  dots: `vec2 q=p*28.;vec2 cell=floor(q);float n=fbm(cell*.055+vec2(t*.045,0.));float radius=intensity(.015,.04,.07)+intensity(.15,.38,.42)*smoothstep(.28,.7,n);float d=length(fract(q)-.5);return mix(pal(0.),pal(2.),(1.-smoothstep(radius-.04,radius,d))*intensity(.3,.75,1.));`,
  // Static gains stronger noise variation and scan-line texture.
  noise: `float base=fbm(p*3.);float shimmer=sin(t*.7+hash(floor(p*180.))*6.283185);float f=base+shimmer*.07;float bands=.5+.5*sin(p.y*90.+base*8.+sin(t*.25)*.2);return mix(pal(0.),pal(2.),clamp(.35+(f-.5)*intensity(.15,.7,1.3)+bands*intensity(.005,.04,.14),0.,1.));`,
  // Atlas gains more contour levels and bolder topographic ink.
  contours: `float f=fbm(p*1.1+vec2(sin(t*.05),cos(t*.04)-1.)*.3);float levels=fract(f*intensity(8.,20.,36.));float line=1.-smoothstep(.025,.065,min(levels,1.-levels));return mix(mix(pal(0.),pal(3.),f),pal(2.),line*intensity(.18,.6,.95));`,
  // Current’s parallel filaments gain wave height and thicker strokes.
  lines: `float y=p.y+sin(p.x*1.6+t*.08)*intensity(.02,.22,.5)+sin(p.x*3.2-t*.06)*intensity(.005,.06,.16);float line=pow(.5+.5*cos(y*70.),intensity(32.,18.,8.));float fade=.4+.6*fbm(p*1.5);return mix(pal(0.),palette(p.x*.15+.5),line*fade);`,
  // Afterglow’s color bloom expands outward and diffuses over a wider area.
  diffusion: `vec2 q=p-vec2(0.,.12);float breath=1.+.12*sin(t*.12);float r=length(q*vec2(.75,1.))/(intensity(.5,1.,1.7)*breath);return mix(palette(clamp(r*.55,0.,1.)),pal(0.),smoothstep(.65,1.8,r));`,
  // Gyre’s spiral arms wind more tightly around their center.
  rotation: `float a=t*.035;vec2 q=mat2(cos(a),-sin(a),sin(a),cos(a))*p;float angle=atan(q.y,q.x);float f=.5+.5*sin(angle*2.+length(q)*intensity(.25,2.,5.));return palette(f*.85+.05);`,
  // Quiet stays quiet: its tonal gradient becomes more defined.
  monochrome: `float f=smoothstep(intensity(-3.,-1.3,-.6),intensity(3.,1.2,.55),p.x*.4+p.y*.8+sin(t*.045)*.1);return mix(pal(0.),pal(1.),f);`,
  // Halo’s central glow and surrounding ring radiate more strongly.
  atmosphere: `float breath=sin(t*.16);float r=length(p-vec2(0.,-.2));float light=exp(-r*r*(2.-breath*.2))*(1.+breath*.06);float halo=exp(-pow((r-(.55+breath*.035))*5.,2.))*.3;return mix(pal(0.),pal(2.),light*intensity(.2,.65,1.))+pal(3.)*halo*intensity(.03,.2,.55);`,
  // Pigment’s paint swirls thicken and brush texture becomes more visible.
  paint: `vec2 q=p;float a=fbm(q*1.8+t*.025);q+=vec2(a,sin(q.x*1.5+t*.06))*intensity(.1,.8,1.5);float f=.5+.5*sin(q.x*3.+q.y*1.3+fbm(q*5.)*intensity(.1,.8,1.6));vec3 c=palette(f);float brush=noise(vec2(q.x*70.,q.y*3.));return c*(1.-intensity(.01,.07,.2)+brush*intensity(.01,.07,.2));`,
};
export const vertexShader = `#version 300 es
in vec2 a_position;void main(){gl_Position=vec4(a_position,0.,1.);}`;
export function fragmentShader(id: string) {
  return `#version 300 es
precision highp float;
out vec4 outColor;
uniform float u_time,u_pixelRatio,u_seed,u_motion,u_scale,u_noise,u_grain,u_warp,u_warpScale,u_distortion,u_noiseScale,u_direction,u_softness,u_contrast,u_luminosity,u_saturation,u_intensity,u_interpolation;
uniform vec2 u_resolution,u_pointer;
uniform sampler2D u_image;uniform float u_hasImage;uniform vec2 u_imageSize;
uniform vec3 u_palette[8];uniform int u_paletteCount;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+u_seed)*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
vec2 grad(vec2 i){float a=hash(i)*6.283185;return vec2(cos(a),sin(a));}
float perlin(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*f*(f*(f*6.-15.)+10.);return .5+.7*mix(mix(dot(grad(i),f),dot(grad(i+vec2(1,0)),f-vec2(1,0)),u.x),mix(dot(grad(i+vec2(0,1)),f-vec2(0,1)),dot(grad(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=mat2(.8,.6,-.6,.8)*p*2.03;a*=.5;}return v;}
vec3 pal(float x){return u_palette[int(clamp(x,0.,float(u_paletteCount-1)))];}
vec3 palette(float x){float s=clamp(x,0.,.9999)*float(u_paletteCount-1);float f=fract(s); if(u_interpolation>.5)f=f*f*(3.-2.*f);if(u_interpolation>1.5)f=step(.5,f);return mix(pal(floor(s)),pal(floor(s)+1.),f);}
// Each scene chooses its own low / neutral / high values. The midpoint is the
// original composition, and intensity never changes time or the shared palette.
float intensity(float low,float neutral,float high){float level=clamp(u_intensity,0.,2.);return level<=1.?mix(low,neutral,level):mix(neutral,high,level-1.);}
vec3 scene(vec2 p,float t){${algorithms[id] ?? algorithms.mesh}}
void main(){
  vec2 uv=gl_FragCoord.xy/u_resolution;
  vec2 p=(uv-.5)*2.;
  p.x*=u_resolution.x/u_resolution.y;
  p*=u_scale;
  float cs=cos(u_direction),sn=sin(u_direction);
  p=mat2(cs,-sn,sn,cs)*p;

  // Time is integrated by the renderer using this scene's motion profile.
  // Only the scene animates: composition, print grids, and material overlays stay anchored.
  float t=u_time+u_seed*.13;
  float seedPhase=u_seed*.13;
  p+=u_warp*.15*vec2(sin(p.y*u_warpScale+seedPhase*.12),cos(p.x*u_warpScale-seedPhase*.1));
  p+=u_distortion*.12*(vec2(noise(p*u_noiseScale+seedPhase*.08),noise(p*u_noiseScale-seedPhase*.07))-.5);
  p+=(u_pointer-.5)*.018;

  vec3 c=scene(p,t);

  c+=(noise(p*u_noiseScale*3.)-.5)*u_noise*.08;
  float lum=dot(c,vec3(.2126,.7152,.0722));
  c=mix(vec3(lum),c,u_saturation);
  c=(c-.5)*u_contrast+.5+u_luminosity;
  c+=(hash(gl_FragCoord.xy/max(u_pixelRatio,1.))-.5)*u_grain;
  outColor=vec4(clamp(c,0.,1.),1.);
}`;
}
