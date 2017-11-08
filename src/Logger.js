module.exports = () => {
    let now = new Date();
    let timestamp = '[ ' + now.toUTCString() + ' ] ';

    return {
        log: (string) => {
            console.log(timestamp + string);
        },
        error: (string) => {
            console.error(timestamp + string);
        }
    };
};
