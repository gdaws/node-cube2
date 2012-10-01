
function gamemode(code){
  return [
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
  ][code + 3];
}

function mastermode(code){
  return [
    "auth",
    "open",
    "veto",
    "locked",
    "private",
    "password"
  ][code + 1];
}

module.exports = {
  
  PING_PORT: 28786,
  GAMESERVER_PORT: 28787,
  MASTERSERVER_PORT: 28788,
  
  gamemode: gamemode,
  mastermode: mastermode
};
