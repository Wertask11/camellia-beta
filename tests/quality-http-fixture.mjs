/** Synthetic local HTTP only; not imported by any release entry. */
export function attachQualityRoutes(server){
 let posts=[];
 server.middlewares.use(async(req,res,next)=>{
  const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith('/api/camellia/circle')&&!url.pathname.startsWith('/api/camellia/place')&&url.pathname!=='/__ux/quality-reset')return next();
  const json=(value,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));};
  const {PLACE_DEMO_DATA}=await server.ssrLoadModule('/data/place-demo.ts');
  const now=new Date().toISOString(),place={...PLACE_DEMO_DATA[0],id:'quality-ui-place',slug:'quality-ui-place',name:'LOCAL TEST PLACE',description:'LOCAL TEST EXPERIENCE',experience:'LOCAL TEST EXPERIENCE',status:'published',officialUrl:'https://example.org/',mapUrl:'https://example.org/map',bookingUrl:'https://example.org/book',address:'LOCAL TEST ADDRESS',reservation:'optional',informationCheckedAt:now};
  const original=()=>({id:'quality-ui-post',circleId:'interests',authorId:'local-public-id',displayName:'LOCAL MEMBER',text:'LOCAL PUBLIC POST',createdAt:now,updatedAt:now,mine:false,relatedPlace:{slug:place.slug,name:place.name,recommendedFor:['quiet']}});
  if(url.pathname==='/__ux/quality-reset'){posts=[original()];json({ok:true});return;}
  if(url.pathname==='/api/camellia/place'){if(req.method==='POST'){json({ok:true});return;}if(url.searchParams.has('operatorStatus')){json({operator:false});return;}json(url.searchParams.has('slug')?{place}:{places:[place],nextCursor:undefined});return;}
  if(req.method==='POST'){
   let raw='';req.on('data',c=>raw+=c);req.on('end',()=>{const body=JSON.parse(raw||'{}');if(body.operation==='post')posts.unshift({id:`local-${posts.length}`,circleId:'interests',authorId:'local-own-id',displayName:'LOCAL QA',text:body.text,createdAt:now,updatedAt:now,mine:true,...(body.placeSlug?{relatedPlace:{slug:place.slug,name:place.name,recommendedFor:['quiet']}}:{})});json({ok:true});});return;
  }
  if(url.searchParams.has('postingOptions')){json({placeLinksEnabled:true,merchant:false,places:[{slug:place.slug,name:place.name}]});return;}
  if(url.searchParams.has('version')){json({version:posts.length});return;}
  if(url.searchParams.has('circle')){json({posts:posts.length?posts:[original()],comments:[],version:posts.length});return;}
  json({circles:[{id:'interests',name:'好きなことを見つけたい',description:'LOCAL CIRCLE',joined:true,memberCount:2}],moderator:false,own:[],blocks:[]});
 });
}
