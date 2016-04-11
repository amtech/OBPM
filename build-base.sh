# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

# helpers
printerr() {
    color ${RED} "ERROR: $1"
    exit 1
}
printwarn(){
    color ${YELLOW} "WARN:  $1"
}
printinfo(){
    color ${GREEN} "INFO:  $1"
}
printStep(){
    echo ""
    color ${BLUE} "STEP:  $1"
}
color(){
    echo -e "$1$2${NC}"
}
