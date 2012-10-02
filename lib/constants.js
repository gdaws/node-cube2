
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
  GAMESERVER_PORT: 28787,
  MASTERSERVER_PORT: 28788,
  
  gamemode: gamemode,
  mastermode: mastermode
};
