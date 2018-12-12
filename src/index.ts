import { CreateAccountOperation } from "./operations/create-account";
import { GetTokenOperation } from "./operations/get-token";

export default class Acme2 {
    
    public readonly token: GetTokenOperation;
    public readonly create: CreateAccountOperation;

    private readonly urls: any = {
        staging: 'https://acme-staging-v02.api.letsencrypt.org/acme',
        production: 'https://acme-v02.api.letsencrypt.org/acme'
    };

    constructor(env: 'staging | production') {

        const baseUrl = this.urls[env];

        this.token = new GetTokenOperation(baseUrl);
        this.create = new CreateAccountOperation(baseUrl);

    }
}