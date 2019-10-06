import "colors";
import * as differ from 'diff'
import { Runner } from "../Runner";

export function test(source: Map<string, string>, runner: Runner) {
    let outputs = "";
    runner.output = (output: string) => (outputs += output + "\n");
    let numOfTestsPassed = 0;
    const total = source.size;
    let passedAllTests = true;
    try {
        source.forEach((answer, source) => {
            runner.run(source, {
                printTokenList: false,
                printGeneratedCode: true,
                genereateFrontMatters: false,
            });
            if (trimNewlines(outputs) !== answer) {
                console.warn(`Source:\n${source}`);
                const diff = differ.diffLines(answer, outputs, { newlineIsToken: true });
                let diffString = "";
                diff.forEach((part) => {
                    // green for additions, red for deletions
                    // grey for common parts
                    part.value = trimNewlines(part.value);
                    const color = part.added ? 'red' :
                        part.removed ? 'green' : 'grey';
                    const prefix = part.added ? ' + ' :
                        part.removed ? ' - ' : '   ';
                    if (part.value !== "") {
                        if (!part.value.startsWith("\n")) {
                            part.value = "\n" + part.value;
                        }
                        diffString += ((part.value).replace(/\n/g, `\n${prefix}`)[color]);
                    }
                });
                console.warn(diffString);
                console.warn(`Passed ${numOfTestsPassed}/${total} (${Math.round(numOfTestsPassed / total * 100)}%) tests.`.yellow);
                throw "Incorrect result!";
            }
            numOfTestsPassed++;
            outputs = "";
        });
    } catch (error) {
        // do not print the error, relevant info already printed
        passedAllTests = false;
    }
    if (passedAllTests) {
        console.warn(`Passed all ${total} tests!`.yellow);
    }
}

function trimNewlines(str: string) {
    return str.replace(/\n+$/, "").replace(/^\n+/, "");
}