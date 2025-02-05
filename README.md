# PortfoiloTracker. Deploy on server Ubuntu 22.04 (AWS 1GB/1CPU Free Tier)

## INSTALL NODE.JS & NPM

```
sudo su
cd
sudo apt update
curl https://raw.githubusercontent.com/creationix/nvm/master/install.sh | bash
source ~/.profile
nvm install 21.2.0
```

##### Install Git, FibaBot3 GUI

```
cd ~/; git clone https://github.com/volkovartem77/portfolio_tracker.git
```

**Install all dependencies in package.json**
```
cd ~/portfolio_tracker/; npm install
```

# Run app (docker)
The next step is to build the project by the following command:\
```npm run build```\
After it is built run docker\
```docker compose up -d```\
And go to http://your_external_ip:8080

### Update project
```
cd ~/portfolio_tracker
docker compose down
git pull
```
```
npm run build
docker compose up -d
```