
import { runFanFile, executeFanCmd } from '../utils/fanUtils';

export function test () {
    executeFanCmd('dir', [""]).then(console.log).catch(console.error);
    runFanFile('./fan/inspector.fan', ['arg1', 'arg2']).then(console.log).catch(console.error);
}