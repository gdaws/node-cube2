# Install

    npm install cube2

After it's installed cd into the cube2 module directory and run the test suite

    mocha -u bdd --compilers coffee:coffee-script test

To run the test suite you will need to have the mocha and coffee-script module installed (if these are local installs you may need to alter your PATH environment to make the modules shell scripts accessible).

# Server List

Here's how to fetch the list of registered game servers from the master server

    cube2.masterserver.downloadServerList({
      callback:function(servers){
        // Do something with the servers argument
      }
    });

If the request is successful the servers argument will be an array where each element is an object with an address and port property.

# Ping Server

    var client = new cube2.gameserver.PingSocket();

    client.ping({
      hostname: "127.0.0.1", /* required */
      port: 28786,
      timeout: 2000,
      query: "server", /* required */
      callback: function(reply, errorMessage){

        // Check for error condition
        if(reply === undefined){
          console.log("Ping error: " + errorMessage);
          return;
        }
        
        // Process the reply
        console.log(reply);
      }
    });

You will only ever have to create one PingSocket object for your application; a single PingSocket object can support any number of concurrent ping requests. For example, to get server information on all the registered game servers, call client.ping for each element in the server list.

## server query

reply object

    {
      ping: integer,
      protocol: integer,
      numClients: integer,
      maxClients: integer,
      gamemode: string,
      timeleft: seconds/integer,
      mastermode: string,
      mastermodeNum: integer,
      map: string,
      name: string 
    }



## uptime query

reply object

    {
      uptime: integer
    }


## playerStats query

reply object

    {
      playerStats:{
        <"$cn:$ip">:{
          cn: integer,
          ping: integer,
          name: string,
          team: string,
          frags: integer,
          flags: integer,
          deaths: integer,
          teamkills: integer,
          damage: integer,
          health: integer,
          armour: integer,
          gunselect: integer,
          privilege: integer,
          state: integer,
          ip: string,
          id: same as key value
        }
        ...
      }
    }


## teamStats query

reply object

    {
      teamStats:{
        <team name>:{
          score: integer,
          bases: [integer*]
        }
        ...
      }
    }
