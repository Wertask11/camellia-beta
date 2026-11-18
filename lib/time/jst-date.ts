/** Server/client-safe JST calendar date; no private state or content catalog dependencies. */
export const jstDate=(date=new Date())=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
