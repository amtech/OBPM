export class AppConfig{
    public authDatabase: string;
    public apiPort: number;
    public dbHost: string;
    public dbPort: number;

    constructor() {
        // default values:
        this.authDatabase = 'obpm_users';
        this.apiPort = 8090;
        this.dbHost = 'localhost';
        this.dbPort = 8529;
    }
}

let defaultConfig = new AppConfig;

export default function () {
    return defaultConfig;
};
