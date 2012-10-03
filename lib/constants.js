
function gamemode(lookup){
  
  var modes = [
    "SP",
    "DMSP",
    "demo",
    "ffa",
    "coop edit",
    "teamplay",
    "instagib",
    "instagib team",
    "efficiency",
    "efficiency team",
    "tactics",
    "tactics teams",
    "capture",
    "regen capture",
    "ctf",
    "insta ctf",
    "protect",
    "insta protect",
    "hold",
    "insta hold",
    "efficiency ctf",
    "efficiency protect",
    "efficiency hold"
  ];
  
  if(typeof lookup === "number"){
    return modes[lookup + 3];
  }
  else{
    for(var i = 0; i < modes.length; i++){
      if(modes[i] === lookup){

        return i - 3;
      }
    }
  }
}

function mastermode(lookup){
  
  var modes = [
    "auth",
    "open",
    "veto",
    "locked",
    "private",
    "password"
  ];
  
  if(typeof lookup === "number"){
    return modes[lookup + 1];
  }
  else{
    for(var i = 0; i < modes.length; i++){
      if(modes[i] === lookup){
        return i - 1;
      }
    }
  }
}

module.exports = {
  
  PING_PORT: 28786,
  PING_EXTINFO_ACK: -1,
  PING_EXTINFO_VERSION: 105,
  PING_EXTINFO_NO_ERROR: 0,
  PING_EXTINFO_ERROR: 1,
  PING_EXTINFO_PLAYERSTATS_RESP_IDS: -10,
  PING_EXTINFO_PLAYERSTATS_RESP_STATS: -11,
  PING_EXTINFO_UPTIME: 0,
  PING_EXTINFO_PLAYERSTATS: 1,
  PING_EXTINFO_TEAMSCORE: 2,
  
  GAMESERVER_PORT: 28787,
  MASTERSERVER_PORT: 28788,
  
  gamemode: gamemode,
  mastermode: mastermode
};
