#!/usr/bin/env node

/****************************
This was an afternoon project I wrote to help my 7-yr-old learn PhaserJS

Why? Too much boilerplate to get in the way of learning the fun stuff.

Also, the darned PhaserJS website is awful -- they actually advise installing MAMP.
What is this the 80's?

I found an excellent starter template and adjusted it to my needs then created this
little installer to do the initial setup.
**************************/

const chalk = require('chalk')
const clear = require('clear')
const figlet = require('figlet')
// const path = require('path')
const fs = require('fs')
const inquirer = require('inquirer')
// const cwd = process.cwd()
const args = process.argv
const gitUser = require('git-user-name')
const gitUsername = require('git-username')
const gitEmail = require('git-user-email')
const { execSync } = require('child_process')
const open = require('open')
const readline = require('readline')
const template = 'https://github.com/chadananda/phaser-auto-template'

var replacements = {
  game_title:'', project_name:'', game_description:'', author_name:'', author_email:'', game_domain:'', gitUser:''
}


/******************************/
init()
/******************************/

async function init() {
  clear()
  console.log(
    chalk.green.bold.italic(
      figlet.textSync('M K G A M E', { horizontalLayout: 'full', font: 'Fire Font-s' })
    )
  )
  console.log(chalk.gray.bold(`\n Boilerplate is tedious. Let's make a new PhaserJS game!  👍👍`))


  let input, def

  replacements.author_name = gitUser()
  replacements.author_email = gitEmail()
  replacements.gitUser = gitUsername()

  // Game Title
  def = args.slice(2)[0] || ''
  replacements.game_title = def
  if (!def || def.length<1) {
    input = await promptForTitle()
    replacements.game_title = input.title.trim()
  }

  // Project Name
  def = replacements.game_title.toLowerCase().trim().replace(/ /g, '-')
  input = await promptForProjectName(def)
  replacements.project_name = input.proj.trim()

  if (fs.existsSync(replacements.project_name)) {
    console.log('\n\n')
    console.warn(chalk.red.bold(' ⚠️  WARNING: ') + ' cannot continue, folder already exists: '+ chalk.red(replacements.project_name))
    console.log('\n\n')
    process.exit()
  }

  // Game Description
  input = await promptForDescription()
  replacements.game_description = input.desc.trim()

  // Public Game URL
  def = `${replacements.gitUser.toLowerCase()}.github.io/${replacements.project_name}`
  input = await promptForURL(def)
  replacements.game_domain = input.url.trim()
  replacements.git_repo = `git@github.com:${replacements.gitUser}/${replacements.project_name}.git`

  await confirm(
    chalk.red.bold('Hit enter to create a repository on GitHub (cloned from a template). Use "')+
    chalk.green.bold(replacements.project_name)+
    chalk.red.bold('" as your new repository name.')
  )

  await open( `${template}/generate`)

  await confirm(
    chalk.red.bold('Hit enter when GitHub has finished creading your new repository "')+
    chalk.green.bold(replacements.project_name)+
    chalk.red.bold('"')
  )

  await generateProject(replacements)

  process.exit()

/*
  details:
    github_user


  replacements:

  [[game_title]]
  [[project_name]]
  [[game_description]]
  [[author_name]]
  [[author_email]]
  [[game_domain]]


*/





  async function promptForTitle() {
    console.log('')
    return inquirer.prompt([{
      message: "🤖 Game Title: ",
      name: "title"    /* Pass your questions in here */
    }])
  }

  async function promptForProjectName(title) {
    console.log('')
    return inquirer.prompt([{
      message: "🤖 Repository Name: ",
      name: "proj",    /* Pass your questions in here */
      default: title
    }])
  }

  async function promptForDescription() {
    console.log('')
    return inquirer.prompt([{
      message: "🤖 Project Description: ",
      name: "desc",    /* Pass your questions in here */
    }])
  }

  async function confirm(message) {
    console.log()
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, })
    return new Promise(resolve => rl.question(message, ans => {
      rl.close()
      resolve(ans)
    }))
  }

  async function promptForURL(def) {
    console.log('')
    return inquirer.prompt([{
      message: "🤖 Public Game URL (you can change this later): ",
      name: "url",    /* Pass your questions in here */
      default: def
    }])
  }


 async function replaceStuff(tdir, replacements) {
   let files = ['README.md', 'package.json', 'public/index.html', 'public/manifest.json', 'src/index.js' ]
   let targets = []
   files.forEach(file => {
     file = `${tdir}/${file}`
     if (fs.existsSync(file)) {
       let text = fs.readFileSync(file, "utf8")
       if (text.length) Object.keys(replacements).forEach(key => {
         text = text.replace(new RegExp(`\\[\\[${key}\\]\\]`, 'g'), replacements[key])
       })
       fs.writeFileSync(file, text)
     }
   })
 }


 async function generateProject(replacements) {
    let r = replacements // because the word is just too long
    let tdir = process.cwd() +'/'+ r.project_name
    // console.log('Generating repo: '+r.project_name, 'at', `${template}/generate`, )

    // create and cd to project dir
    console.log(chalk.green.bold('\n ✅ ') + chalk.gray('Creating project folder: '+r.project_name))
    if (!fs.existsSync(tdir)) fs.mkdirSync(tdir)

    // clone repo
    console.log(chalk.green.bold('\n ✅ ') + chalk.gray('Initializing git from template: '+template))
    execSync(`git clone -q '${replacements.git_repo}' '${tdir}'`)

    // update files
    console.log(chalk.green.bold('\n ✅ ') + chalk.gray('Customizing template files and pushing changes to GitHub...'))
    await replaceStuff(tdir, replacements)
    process.chdir(tdir)
    execSync('git commit -am "customized template with search and replace"')
    execSync('git push')

    // add CNAME file if needed
    let def_domain = `${replacements.gitUser.toLowerCase()}.github.io/${replacements.project_name}`
    if (replacements.game_domain!=def_domain) {
      console.log(chalk.green.bold('\n ✅ ') + chalk.gray('Adding custom domain CNAME file...'))
      let output = tdir +'/public/CNAME'
      fs.writeFileSync(output, replacements.game_domain)
      // add file to GIT
      let cmd = 'git add '
      execSync('git add ./public/CNAME')
      execSync('git commit -am "added custom CNAME file to /public dir"')
      execSync('git push')
    }

    // build and deploy
    console.log(chalk.green.bold('\n ✅ ') + chalk.gray('Installing NPM modules, this can take a while!'))
    execSync('npm install')
    execSync('git add package-lock.json')
    execSync('git commit -am "added package-lock.json to repo"')
    execSync('git push')

    // build
    console.log(chalk.green.bold('\n ✅ ') + chalk.gray('Building game...'))
    execSync('npm run build')

    // build
    console.log(chalk.green.bold('\n ✅ ') + chalk.gray('Deploying game to GitHub, you can view at: http://'+r.game_domain+'\n\n\n'))
    execSync('npm run deploy')

    console.log('🥳 🥳 🥳 \n\n\n')

  }

}







function directoryExists(filePath){
  return fs.existsSync(filePath)
}