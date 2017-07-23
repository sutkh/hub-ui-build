const os = require('os');
const path = require('path');
const fsProm = require('./lib/fs-promise');
const execute = require('./lib/execute');

if (os.platform() === 'win32') {
    throw new Error('We don\'t support aliases for Windows');
}

const runHubPath = path.resolve(__dirname, 'hub-up.js');
const runDevPath = path.resolve(__dirname, 'hub-dev.js');
const bashrcPath = path.resolve(os.homedir(), '.bashrc');
const bashProfilePath = path.resolve(os.homedir(), '.bash_profile');
const uiDir = path.resolve(__dirname, '../ui');
const cmdsDir = path.resolve(__dirname, 'commands');
const startHub = `node ${runHubPath}`;

const aliases = [
    `alias hub-up='${startHub};'`,
    `alias hub-dev='node ${runDevPath};'`
];

fsProm.isFile(bashrcPath)
    .catch(err => false)
    .then(isFile => {
        if (isFile) {
            return fsProm.concatUniqueLines(bashrcPath, aliases);
        } else {
            return fsProm.writeFile(bashrcPath, `${aliases.join('\n')}\n`);
        }
    });

const source = `source ${bashrcPath}`;

fsProm.isFile(bashProfilePath)
    .catch(err => false)
    .then(isFile => {
        if (isFile) {
            return fsProm.concatUniqueLines(bashProfilePath, [source]);
        } else {
            return fsProm.writeFile(bashProfilePath, `${source}\n`);
        }
    });

const buildUi = `printf '\\e[4;480;470t'; printf '\\e[3;540;0t'; printf '\\e[5t'; cd ${uiDir};\ngrunt default watch;\n`;
const runLocalProxy = `printf '\\e[4;480;470t'; printf '\\e[3;540;470t'; cd ${uiDir};\nnode dev-server.js --local-port=8081 --remote-port=8080 --remote-host=localhost --no-mocks --no-ssl;\n`;
const buildUiCmdPath = path.resolve(cmdsDir, 'ui-build.command');
const buildHubCmdPath = path.resolve(cmdsDir, 'hub-start.command');
const proxyCmdPath = path.resolve(cmdsDir, 'ui-proxy.command');

fsProm.cleanDirectory(cmdsDir)
    .then(() => Promise.all([
        fsProm.writeFile(buildUiCmdPath, buildUi),
        fsProm.writeFile(buildHubCmdPath, `printf '\\e[4;0;540t'; printf '\\e[3;0;0t'; ${startHub};`),
        fsProm.writeFile(proxyCmdPath, runLocalProxy)
    ]))
    .then(() => Promise.all([
        execute.setPermission(buildUiCmdPath),
        execute.setPermission(buildHubCmdPath),
        execute.setPermission(proxyCmdPath)
    ]));