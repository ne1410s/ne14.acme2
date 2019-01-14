import * as express from "express";
import * as cors from "cors";
import * as bodyParser from "body-parser";
import * as apiConfig from "./api.json"
import * as path from "path";
import { ExpressService } from "./express-api/services/express";
import { DbContext } from "./database/db-context";
import { AuthUtils } from "./express-api/utils/auth.js";

const db = new DbContext();
const expr_svc = new ExpressService(db);
const expr_api = express();

const proc = (q: express.Request, r: express.Response, entity: string, operation: string) => {
    
    (expr_svc as any)[entity][operation].invoke({ ...q.body, ...q.query, ...q.params })
        .then((res: any) => r.json(res))
        .catch((err: any) => {
            let cause = err;
            do { cause = cause.cause }
            while (cause.cause);

            const status = cause.status || (cause.errors ? 422 : 500);
            let message = cause.toString();

            if (cause.body) { 
                try { message = JSON.parse(cause.body).detail; }
                catch(ex) { console.warn('Failed to get body detail', cause.body, ex); }
            }

            r.status(status);
            r.json({ message, detail: cause.errors });

            if (status === 500) console.error(cause);
        });
};

/**
 * Secure process: requires a valid bearer token. 
 */
const sec_proc = (q: express.Request, r: express.Response, entity: string, operation: string) => {       
    
    try {
        const authHeader = q.header('authorization'),
              token = ((authHeader || '').match(/^[Bb]earer ([\w-]*\.[\w-]*\.[\w-]*)$/) || [])[1] || '',
              userId = AuthUtils.verifyToken(token, apiConfig.secretKeys.jwt);
              
        q.body = { ...q.body, ...q.query, ...q.params };
        q.body.authenticUserId = userId;

        proc(q, r, entity, operation);
    }
    catch(err) {
        r.status(401);
        r.json({ message: 'Error: Access denied' })
    } 
};

// defer api startup til db init
db.syncStructure().then(() => {

    expr_api.use(cors());
    expr_api.use(bodyParser.json());

    // Static resources
    expr_api.get('/style.css', (q, r) => r.sendFile(path.resolve(__dirname, '../ui/style.css')));
    expr_api.get('/main.js', (q, r) => r.sendFile(path.resolve(__dirname, '../ui/main.js')));
    expr_api.get('/loading.svg', (q, r) => r.sendFile(path.resolve(__dirname, '../ui/loading.svg')));
    expr_api.get('/', (q, r) => r.sendFile(path.resolve(__dirname, '../ui/index.html')));

    // User Operations
    expr_api.post('/user', (q, r) => proc(q, r, 'users', 'register'));
    expr_api.post('/login', (q, r) => proc(q, r, 'users', 'login'));

    // Account Operations
    expr_api.post('/account', (q, r) => sec_proc(q, r, 'accounts', 'create'));
    expr_api.get('/account', (q, r) => sec_proc(q, r, 'accounts', 'list'));
    expr_api.delete('/account/:accountId', (q, r) => sec_proc(q, r, 'accounts', 'delete'));

    // Order Operations
    expr_api.get('/order', (q, r) => sec_proc(q, r, 'orders', 'get'));
    expr_api.post('/order', (q, r) => sec_proc(q, r, 'orders', 'create'));
    // app.put('/order/finalise', (q, r) => proc(q, r, 'orders', 'finalise'));
    // app.get('/order/cert', (q, r) => proc(q, r, 'orders', 'getcert'));

    // // Challenge Operations
    // app.get('/challenge', (q, r) => proc(q, r, 'challenges', 'list'));
    // app.get('/challenge/detail', (q, r) => proc(q, r, 'challenges', 'detail'));
    // app.put('/challenge/fulfil', (q, r) => proc(q, r, 'challenges', 'fulfil'));

    // Start!
    expr_api.listen(apiConfig.portNumber, () => {
        console.log(`Listening on port ${apiConfig.portNumber}`);
    });
});
