function find_agent_name ( accounts , agents , id ){
	let agent_id = "";
	let return_value = "";
	accounts.map((item) => {
		if ( JSON.stringify(item._id) == JSON.stringify(id) ) { agent_id = item.agent_id; }			
	});
	
	if ( agent_id != "" && agent_id != undefined )
	{
	    agents.map((item) => JSON.stringify(item._id) == JSON.stringify(agent_id) ? return_value = item.agent_name : "" );
    }
    return return_value;
}
 
module.exports = find_agent_name;