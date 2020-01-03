#!/bin/bash

stop() {
    echo "docker-compose stop"
    docker-compose stop

    echo "docker-compose remove"
    docker-compose rm -f

}

remove() {
    docker-compose down
}

start() {
    echo "docker-compose run with build image "
    docker-compose up -d --build
}

db-backup() {
    # Backup
    docker exec mfg-4b-sz_db /usr/bin/mysqldump -u root --password=root storeasservice > backup.sql
}

db-restore() {
    # Backup
    cat backup.sql | docker exec -i mfg-4b-sz_db /usr/bin/mysql -u root --password=root storeasservice
}


case "$1" in
  start)
    start
    ;;
  stop)
    stop
    ;;
  remove)
     remove
     ;;
  install)
     install
     ;;
  db-restore)
     db-restore
     ;;
  db-backup)
     db-backup
     ;;
  *)
    echo "Usage: $0 start|stop|remove|install|db-restore|db-backup" >&2
    exit 3
    ;;
esac
