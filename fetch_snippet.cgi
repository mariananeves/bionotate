#!/usr/bin/perl

# Perl script that receives the username and returns the file and folder of a new snippet not yet seen by this user 
# and whose annotation has not yet been completed. 
# If the username is "anonymous" then a random snippet is returned.
# This script needs:
# 1.-Variable f_list_snippets: location of the file listing all the snippets in the corpus and the users which annotated each snippet. 
#
# Author: Carlos Cano
# Date: 09/15/08


##############################

# Get STDIN:
#Retrieve from the client the userID and the id of the last annotated snippet: 
read (STDIN,$stdin,$ENV{'CONTENT_LENGTH'});

# Get username:
($username,$junk) = split("</username>",$stdin);
($junk,$username) = split("<username>",$username);


##############################

$f_list_snippets = "dirList/listSnippets.txt";

if(!open(FLIST,$f_list_snippets)) {
    print "Status: 404\n\n";
    return;
}
@list_snippets = <FLIST>;
close(FLIST);


if ($username eq "null"){
	$username = "anonymous";
}

#retrieve a random snippet not yet seen by this user and whose annotation has not yet been completed. 
retrieve_next_snippet(); 


# Send back data:
print "Content-type: text/xml\n\n" ;
print "<?xml version=\"1.0\" encoding=\"utf-8\"?>";
print "<out><dir>$dir</dir><file>$file</file></out>\n";



sub retrieve_next_snippet{
	#retrieves a random snippet not yet seen by this user and whose annotation has not yet been completed. 
	#Input: this function uses global variables: $username and @list_snippets
	#Output: this function assigns value to global vars $dir and $file, indicating the folder and file name of the next snippet to annotate

	#1st search for snippets in @list_snippets which 
		#- have STATE "0" (need annotation)
		# AND	
		#- have not been annotated by $user (only when $user is not "anonymous")
	if ($username ne "anonymous"){
		@available_snippets = grep(/([^,]+),([^,]+),0,.*/ && !/,$username[,\n]/, @list_snippets);
 	}else{
		@available_snippets = grep(/([^,]+),([^,]+),0,.*/ , @list_snippets);
	}

	if (@available_snippets>0){
		#2nd retrieve the name of the dir and file of one (randomly selected) snippet that fulfills the requirements
		$snippet_index = int(rand(@available_snippets));
		($dir,$file, $junk) = split(",", $available_snippets[$snippet_index],3);
		$file =~ tr/"\n"//d; # remove trailing newline
				
	}else{
		print "Status: 404 (Nothing else to annotate)\n\n";
		exit; 
	}	
}





