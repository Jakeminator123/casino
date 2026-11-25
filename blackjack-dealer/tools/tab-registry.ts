// The studio's open tabs. Every page keeps an event stream open to the server (src/preview-ui.ts), and this is the
// server's book of them. Any number of tabs may be open at once (Jakob 2026-11-25: "ta bort den grej som gör att bara en
// flik av studion kan köras"); none makes another step aside. A page an agent asks for is shown in the newest open tab
// instead of in a new one. Pure logic: no sockets, and the clock is handed in.
export type Reason='stop'|'restart';
export type TabEvent={type:'navigate';url:string}|{type:'retire';reason:Reason};
export type Tab={id:string;page:string;send:(event:TabEvent)=>void};

// A page of this lab, as a path with its query: "lab.html?tab=prov", "/game.html" or the full local address. Anything
// that points somewhere else is refused, so that the open tab can never be sent away from the lab.
export const localPath=(value:unknown,origin:string):string|null=>{
 if(typeof value!=='string'||!value||value.length>600||/[\s\\]/.test(value))return null;
 try{const url=new URL(value,origin+'/');return url.origin===origin?url.pathname+url.search+url.hash:null;}catch{return null;}
};

/**
 * The page asked for by `node tools/preview.ts --open <page> [name=value …]`: the page, and every following word of the form
 * name=value added to its question. A shell on Windows runs what follows an unquoted & as a command of its own, so a page
 * with several words can be given without one: --open /studio/granska/ prov=x fil=a.mp4 is /studio/granska/?prov=x&fil=a.mp4
 * (a quoted "…?prov=x&fil=a.mp4" works as before). Without a page, the studio. Null for a page outside the lab.
 */
export const openAddress=(args:readonly string[],origin:string):string|null=>{
 const at=args.indexOf('--open');if(at<0)return null;
 const rest:string[]=[];for(let i=at+1;i<args.length&&!args[i].startsWith('--');i++)rest.push(args[i]);
 const [page,...words]=rest.length&&!/^[^/?]*=/.test(rest[0])?rest:['/studio/',...rest];
 const target=localPath(page,origin);if(!target)return null;
 if(!words.length)return target;
 const url=new URL(target,origin+'/');
 for(const word of words){const m=/^([A-Za-z0-9_.-]+)=(.*)$/.exec(word);if(!m)return null;url.searchParams.append(m[1],m[2]);}
 return localPath(url.pathname+url.search+url.hash,origin);
};

export const tabRegistry=(now:()=>number=Date.now)=>{
 // The open tabs in the order they opened: the last one is the newest, the one a page is shown in.
 const open:Tab[]=[];let lastSeen=now();
 const newest=()=>open.at(-1)??null;
 return {
  // A page has opened its stream. A page whose stream comes again (the same id) takes the place of its earlier one.
  connect(tab:Tab){const at=open.findIndex(other=>other.id===tab.id);if(at>=0)open.splice(at,1);open.push(tab);lastSeen=now();},
  // The stream of a page has ended: the tab was closed, or went to another page (which opens its own stream).
  disconnect(tab:Tab){const at=open.indexOf(tab);if(at>=0){open.splice(at,1);lastSeen=now();}},
  // Show a page: in the newest open tab if there is one, and otherwise the caller opens a tab.
  show(url:string):{reused:boolean;page:string|null}{const tab=newest();if(!tab)return {reused:false,page:null};tab.send({type:'navigate',url});return {reused:true,page:tab.page};},
  // The server is stopping: every open tab is told, so that no page is left playing against a server that is gone.
  // Before a restart they are told that too, and wait for the new server instead of closing.
  retire(reason:Reason){const told=open.splice(0);lastSeen=now();for(const tab of told)tab.send({type:'retire',reason});},
  // A sign of life from a page without a stream (a test in headless Chrome).
  touch(){lastSeen=now();},
  // How long the server has been without any page; zero while a tab is open.
  idleFor(){return open.length?0:now()-lastSeen;},
  // How many tabs are open, and the page of the newest.
  status(){return {open:open.length,page:newest()?.page??null};}
 };
};
