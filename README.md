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

Docker
```
sudo apt install apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
apt-cache policy docker-ce
sudo apt install docker-ce
```

# Run app (docker)
```docker compose up -d```  \
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