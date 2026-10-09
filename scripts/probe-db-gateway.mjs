// Read-only probe. Credentials are loaded from private environment settings.
import {d1GatewayConfig,gatewayExecutor} from '../lib/d1-http.ts';
const config=d1GatewayConfig();
if(!config)throw Error('Configure both private D1 gateway settings first.');
const health=await fetch(config.origin+'/health',{headers:{Authorization:'Bearer '+config.token},cache:'no-store',signal:AbortSignal.timeout(15000)});
if(!health.ok||(await health.json()).ok!==true)throw Error('Gateway health check failed.');
const result=await gatewayExecutor(config).exec('SELECT 1 AS reachable',[]);
if(result.rows[0]?.reachable!==1)throw Error('Gateway query check failed.');
console.log('PASS authenticated gateway health and native D1 read; no participant data read or changed.');
