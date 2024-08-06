import path from 'path';
import { signFiles } from './SignFiles.js';

const result = signFiles({
    '4014052': [path.join(process.env.BUILD_SOURCESDIRECTORY, 'extension.vsix')],
});

process.exitCode = result;
