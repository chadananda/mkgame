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
const { exit } = require('process')
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

  replacements.author_name = gitUser() || ''
  replacements.author_email = gitEmail() || ''
  replacements.gitUser = gitUsername() || ''

  // Game Title
  def = (args.slice(2)[0] || '')
  replacements.game_title = def
  if (!def || def.length<1) {
    input = await prompt('Game Title')
    replacements.game_title = (input.res || '').trim()
  }
  if (!replacements.game_title) exit('Game Title is required!')

  // Game Description
  input = await prompt('Game Description')
  replacements.game_description = input.res.trim()

  // Project Name
  def = replacements.game_title.toLowerCase().trim().replace(/ /g, '-')
  input = await prompt('Repository Name', def)
  replacements.project_name = input.res.trim()
  if (!replacements.project_name) exit('Project repository name is required!')
  if (fs.existsSync(replacements.project_name)) exit('Folder already exists: '+ chalk.red(replacements.project_name))

  // github userid
  input = await prompt('Github user id', replacements.gitUser)
  replacements.gitUser = (input.res || '').trim()
  if (!replacements.gitUser) exit('Github user is required!')

  // Author name
  input = await prompt('Author name', replacements.author_name)
  replacements.author_name = (input.res || '').trim()
  if (!replacements.author_name) exit('Author name is required!')

  // Author email
  input = await prompt('Author email', replacements.author_email)
  replacements.author_email = (input.res || '').trim()
  if (!replacements.author_email) exit('Author name is required!')


  // Public Game URL
  def = `${replacements.gitUser.toLowerCase()}.github.io/${replacements.project_name}`
  input = await prompt('Domain (you can change this later)', def)
  replacements.game_domain = input.res.trim()
  replacements.git_repo = `git@github.com:${replacements.gitUser}/${replacements.project_name}.git`

  await confirm(
    chalk.red.bold('Hit enter to create a repository on GitHub (cloned from a template). Use "')+
    chalk.green.bold(replacements.project_name)+
    chalk.red.bold('" as your new repository name.')
  )

  await open( `${template}/generate`)

  await confirm(
    chalk.red.bold('Hit enter when GitHub has finished creating your new repository "')+
    chalk.green.bold(replacements.project_name)+
    chalk.red.bold('"')
  )

  await generateProject(replacements)

  process.exit()



  function exit(msg) {
    console.log('\n\n')
    console.warn(chalk.red.bold(' ⚠️  WARNING: ') + msg)
    console.log('\n\n')
    process.exit()
  }

  async function prompt(msg, def='') {
    console.log('')
    let prmpt = { message: `🤖 ${msg}: `, name: "res" }
    if (def) prmpt.default = def
    return inquirer.prompt([prmpt])
  }


  async function confirm(message) {
    console.log()
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, })
    return new Promise(resolve => rl.question(message, ans => {
      rl.close()
      resolve(ans)
    }))
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
    let checkGit
    // console.log('Generating repo: '+r.project_name, 'at', `${template}/generate`, )

    // create and cd to project dir
    console.log(chalk.green.bold('\n ✅ ') + chalk.gray('Creating project folder: ')+ chalk.green(r.project_name))
    if (!fs.existsSync(tdir)) fs.mkdirSync(tdir)

    // clone repo
    console.log(chalk.green.bold('\n ✅ ') + chalk.gray('Cloning repository: ')+chalk.green(r.git_repo))
    execSync(`git clone -q '${r.git_repo}' '${tdir}'`)

    // update files
    console.log(chalk.green.bold('\n ✅ ') + chalk.gray('Customizing template files and pushing changes to GitHub...'))
    await replaceStuff(tdir, r)
    process.chdir(tdir)
    if (execSync('git status').toString().indexOf('nothing to commit')===-1) {
      execSync('git commit -am "customized template with search and replace"')
      execSync('git push -q')
    }

    // add CNAME file if needed
    let def_domain = `${r.gitUser.toLowerCase()}.github.io/${r.project_name}`
    if (r.game_domain!=def_domain) {
      console.log(chalk.green.bold('\n ✅ ') + chalk.gray('Adding custom domain CNAME file...'))
      let output = tdir +'/public/CNAME'
      fs.writeFileSync(output, r.game_domain)
      // add file to GIT
      let cmd = 'git add '
      execSync('git add ./public/CNAME')
      if (execSync('git status').toString().indexOf('nothing to commit')===-1) {
        execSync('git commit -am "added custom CNAME file to /public dir"')
        execSync('git push -q')
      }
    }

    // install NPM modules and commit package-lock.json
    console.log(chalk.green.bold('\n ✅ ') + chalk.gray('Installing NPM modules, this can take a while!'))
    execSync('npm install --silent')
    execSync('git add package-lock.json')
    if (execSync('git status').toString().indexOf('nothing to commit')===-1) {
      execSync('git commit -am "added package-lock.json to repo"')
      execSync('git push -q')
    }

    // build and deploy game
    console.log(chalk.green.bold('\n ✅ ') + chalk.gray('Deploying game to GitHub'))
    execSync('npm run --silent deploy')

    console.log('\n 🥳 🥳 🥳 \n',
      chalk.green('You can share your game at: ')+chalk.blue.underline('http://'+r.game_domain),
     '\n\n\n')


  }
}







function directoryExists(filePath){
  return fs.existsSync(filePath)
}