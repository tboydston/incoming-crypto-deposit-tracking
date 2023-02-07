const validate = require("../lib/validationManager");

const { validations } = validate;

/*
 *  Display general and command specific help messages.
 */
module.exports = async (command) => {
  if (validations.commands[command] === undefined) {
    console.log(
      "\nUsage\n\n",
      "node cli.js <command> <option1>=<option1value> <option2>=<option2value>",
      "\n"
    );

    console.log("Available Commands", "\n");

    Object.keys(validations.commands).forEach((cmd) => {
      console.log(`${cmd}  -  ${validations.commands[cmd].help}`);
    });

    console.log("\n");

    return;
  }

  const validation = validations.commands[command];

  console.log(`\nCommand: ${command}`);
  console.log(`Overview: ${validation.help}`);
  console.log(`Example: ${validation.example}`);

  if (validation.required.length > 0) {
    console.log(`\nOptions \n`);

    validation.required.forEach((option) => {
      let optionMsg = `${option}  -  ${validations.description[option]} `;
      console.log(optionMsg);
      
      if (Array.isArray(validations.types[option])) {
        const optionValues = validations.types[option]
        optionValues.forEach((value) => {
          
          let isDefault = ""
          
          if( validation.default[option] === value ){
            isDefault = "( default )"
          }
          
          console.log(`   ${value}${isDefault}: ${validations.description[value]}`)
        })
      }
      
    });
  }

  console.log("");
};
