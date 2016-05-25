
echo "Installing global dependencies..."

call npm install -g typescript

call npm install -g mocha

call npm install -g tsd



echo "Installing local dependencies..."

call npm install



echo "Installing typing dependencie..."

call tsd install


echo "compiling typescript..."

call tsc
