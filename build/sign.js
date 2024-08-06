import path from 'path';
import { signFiles } from './SignFiles.js';

const result = signFiles({
    '4014052': [path.join(process.env.BUILD_SOURCESDIRECTORY, 'extension.signature.p7s')],
});

process.exitCode = result;
