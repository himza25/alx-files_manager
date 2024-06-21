import dbClient from './utils/db';

const waitConnection = () => new Promise((resolve, reject) => {
  let i = 0;
  const repeatFct = async () => {
    setTimeout(async () => {
      i += 1;
      if (i >= 10) {
        reject(new Error('Could not connect to MongoDB'));
      } else if (!dbClient.isAlive()) {
        repeatFct();
      } else {
        resolve();
      }
    }, 1000);
  };
  repeatFct();
});

(async () => {
  console.log(dbClient.isAlive()); // Should print: false
  try {
    await waitConnection();
    console.log(dbClient.isAlive()); // Should print: true
    console.log(await dbClient.nbUsers()); // Should print the number of users
    console.log(await dbClient.nbFiles()); // Should print the number of files
  } catch (error) {
    console.error(error);
  }
})();
