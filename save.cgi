#!/usr/bin/perl
# Perl script that receives the annotation of a snippet (including the username and the id of the snippet) and performs the following: 
# 1.- Save the annotation in a XML file in the ANNOTATION_FOLDER
# 2.- Update the status and annotators in the f_list_snippets file. For updating the status, the script checks whether the current annotation
#	  meets a minimum agreement with previous annotations (if any) of the same snippet. More details about the agreement function can be found in the 
#	  documentation of the functions below and in the paper describing BioNotate. 
# This script needs:
# 1.-Variable f_list_snippets: location of the file listing all the snippets in the corpus and the users which annotated each snippet. 
# 2.-Variable ANNOTATION_FOLDER: location of the folder with annotations. 
# 3.-Variable f_list_agreements: location of the file listing all the annotations (users) that agree for each snippet. 
#
# How to customize the function for agreement: please modify the function check2AnnotationsAgreement below, adapting it to your annotation schema and to your agreement criteria. 
# Author: Carlos Cano
# Date: 09/18/08


#use strict; 

##############################
# Get the timestamp:
#$datestr2 = &GetTimeStamp;

##############################
# Get STDIN:
read(STDIN, $stdin, $ENV{'CONTENT_LENGTH'}) or die;


$f_list_snippets = "dirList/listSnippets.txt";
$f_list_agreements = "dirList/listAgreements.txt";
$ANNOTATIONS_FOLDER = "./annotations/";

##############################

# Get file information:
$path = extractFromXML($stdin, "location");
$username = extractFromXML($stdin, "author");

##############################
# Save the annotation in a file : 

# The file name for the annotation is the concatenation of the location and the username
$fname = substr($path,0,length($path)-4)."_".$username.".xml";
# If $fname already exists (i.e. two anonymous users annotated the same snippet), append an extra _1, _2, and so on 
$counter = 0;
while (-e $fname){ 
	$counter = $counter+1;
	$fname = substr($path,0,length($path)-4)."_".$username."_".$counter.".xml";
}

# Write annotation to XML file:
if(!open(FP,">$fname")) {
    print "Status: 404 Cannot open file $fname\n\n";
    return;
}
print FP $stdin;
close(FP);

##############################
# Update the STATUS and Number of annotations in the file f_list_snippets
# And the annotations that agree in the file f_list_agreements

# Get the name of the snippet from the whole path: 
@snippetPath = split("/", $path);
$snippet = $snippetPath[$#snippetPath];
$folder = $snippetPath[$#snippetPath-1];

# Read the corpus index file (f_list_snippets)
if(!open(FLISTSNIPPETS,"+<$f_list_snippets")) {
	print "Status: 404\n\n";
	return;
}
@list_snippets = <FLISTSNIPPETS>;


$snippet_found = -1;	#flag: was the snippet in the corpus index?
$snippet_finished = -1; #flag: is the annotation of the snippet completed?
@agreement = ();		#this will contain the set of users who agree for the snippet (if any).


foreach $snippetLine (@list_snippets){

	if ( $snippetLine =~ m/$folder,$snippet,/){
		@fields = split(",",$snippetLine);	
		$fields[$#fields] =~ tr/"\n"//d; # remove trailing newline
		$fields[3] = $fields[3]+1;	#+1 in the number of annotations 
		push (@fields, $username);	#append at the end the name of the annotator

		if ($fields[3]>=2){	#if there exists more than one annotation for the snippet
			@agreement = whoAgree(@fields); #check who agree
			if (meetMinimumAgreement(@agreement)){		#OLD WAY: if (scalar(@agreement)>=2){	#if >=2 agreements
				$fields[2]= 1; 	#STATUS of the snippet <- COMPLETED
				$snippet_finished = 1;
			}
		}

		#rebuild the line with the new information and reload it to the file
		$snippetLine = join(',', @fields). "\n";
		$snippet_found = 1;
		last;
	}
}
if ($snippet_found ==1){	#update the file with the corpus index to include the new annotations.
	seek (FLISTSNIPPETS, 0,0); 
	print  FLISTSNIPPETS @list_snippets; 	#We have modified $snippetLine which points to the corresponding element of @list_snippets
	close (FLISTSNIPPETS);
}else{
    print "Status: 404 Cannot update Snippet information \n\n";
    return;
}

if ($snippet_finished ==1){		#update the file with agreement, including this new snippet with agreement
	# Open the agreements index file (f_list_agreements)
	if(!open(FLISTAGREEMENTS,">>$f_list_agreements")) {
		print "Status: 404\n\n";
		return;
	}
	# Add a new line with the new snippet and its agreements (users who agree)
	print FLISTAGREEMENTS $folder.','.$snippet.','.join(',',@agreement)."\n"; 
	close (FLISTAGREEMENTS);
}

# For Opera and IE not to complain: if everything goes fine we send an empty msg back
print "Content-type: text/xml\n\n" ;
print "<?xml version=\"1.0\" encoding=\"utf-8\"?>";
print "<out></out>\n";



sub meetMinimumAgreement {
# 	function that determines how many annotators have to agree to meet the minimum agreement criterion. 
#	Input: Array of authors who agree (Output of function whoAgree). 
#	Output: If $NUM_AUTHORS or more than $NUM_AUTHORS authors agree, then returns True. Otherwise returns False. $NUM_AUTHORS is set to 2 by default. 

	my @list_agreements = @_;
	my $NUM_AUTHORS = 2; 
	if (scalar(@list_agreements)>=$NUM_AUTHORS){
		return 1; 
	}else{
		return 0;
	}
}


sub whoAgree {
# 	function that checks whether a set of annotations for one snippet meets a minimum degree of agreement or not and 
#	returns the set of annotations that agree.  
#	Methodology: At least X annotations must meet a minimum level of agreement to claim "the annotations agree"
#	The minimum level of agreement between each pair of annotations is provided by the function "check2AnnotationsAgreement" 
#	Input: Array ($folder, $Name, $Status, $NAnnotations, $Annotator1, $Annotator2, ..., $AnnotatorN)
# 	This function uses the global variable $ANNOTATIONS_FOLDER
#	Output: Array ($AnnotatorX1, $AnnotatorX2, ..., $AnnotatorXN) with the list of annotators that agree. 

	my ($folderName, $fileName, $status, $NAnnotations, @Annotations) = @_; 


	#1st: Load every Annotation file in @AnnotationFiles
	my @AnnotationFiles= (); 	#@AnnotationFiles and @Annotators will match: $Annotators[0] is the annotator of $AnnotationFiles[0] and so on...
	my @Annotators = ();
	my $countAnonymous = 0;
	
	foreach $Annotator (@Annotations){
		
		my $AnnotationFileName = $ANNOTATIONS_FOLDER.$folderName."/".$fileName;
		if (($Annotator eq "anonymous")&&($countAnonymous>0)) {
			$AnnotationFileName = substr($AnnotationFileName,0,length($AnnotationFileName)-4)."_".$Annotator."_".$countAnonymous.".xml";
			$Annotator = $Annotator."_".$countAnonymous;
		}else{
			$AnnotationFileName = substr($AnnotationFileName,0,length($AnnotationFileName)-4)."_".$Annotator.".xml";
		}

		push(@AnnotationFiles, loadAnnotationFile($AnnotationFileName));	#push the text of the annotation as one string into the array 
		push(@Annotators, $Annotator);										#also keep track of the name of the annotator

		if ($Annotator =~ m/anonymous/){
			$countAnonymous += 1; 
		}
	}
	
	#2nd: compare every pair of annotations to check whether they meet a minimum agreement
	for (my $i=0; $i<@AnnotationFiles; $i+=1){
		for (my $j=$i+1; $j<@AnnotationFiles; $j+=1){
			#print "\t Pair $i-$j...\n";
			if (check2AnnotationsAgreement($AnnotationFiles[$i], $AnnotationFiles[$j])){
				#print "\tTHEY AGREE\n";
				return ($Annotators[$i], $Annotators[$j]);
			}
		}
	}
	#print "\tNO AGREEMENT\n";
	return 0;
}



sub check2AnnotationsAgreement {
#	function that checks whether two annotations meet a minimum agreement or not. 
# 	Methodology: (this is an example. Modify it as you need) two annotations agree iff:
# 		 - The answers are the same (and they are not "n/a") FOR ALL THE QUESTIONS.
#	Input: Ann1, Ann2: type string. String that contains the XML text with the two annotations
#	Output: True (1) if the two annotations agree , False (0) otherwise.

	my $Ann1 = $_[0];
	my $Ann2 = $_[1];
	
	if (!checkSameAnswers ($Ann1, $Ann2)){
		return 0; 
	}else{ 
		return 1; 
	}
}

sub checkSameAnswers {
#	function that checks whether two annotations present the same answers (and different from 'n/a' for all the questions)
#	Input: Ann1, Ann2: type string. String that contains the XML text with the two annotations
#	Output: True (1) if the two annotations present the same answers (and different from 'n/a' for all the questions) , False (0) otherwise.

	my $Ann1 = $_[0];
	my $Ann2 = $_[1];

	# - The answers are the same (and they are not "n/a")
	my @answers1 = extractTagsFromXML($Ann1, "question");
	my @answers2 = extractTagsFromXML($Ann2, "question");
	if (!@answers1 or !@answers2){
	    print "Status: 404 Error: Annotated files does not contain a 'question' tag\n\n";
	    return 0;
	}

	for (my $i=0; $i<@answers1; $i+=1){
		
		my $a= extractFromXML ($answers1[$i], "id");
		my $b= extractFromXML ($answers2[$i], "id");
		#print "question Id for answer1: $a\n";
		#print "question Id for answer2: $b\n";
		if ( $a ne $b){
		    print "Status: 404 Error: Comparing annotations with different questions: $a $b\n\n";
		    return 0;
		}
		
		my $answer1 = extractFromXML ($answers1[$i], "answer");
		my $answer2 = extractFromXML ($answers2[$i], "answer");
		#print "answer1:$answer1\n";
		#print "answer2:$answer2\n";
		if ($answer1 eq "undefined"){
		    print "Status: 404 Error: Got 'undefined' as answer\n\n";
		    return 0;
		}
		if ($answer1 ne $answer2 || $answer1 eq "n/a"){
			return 0;
		}
	}


	return 1;
}



sub extractFromXML {
#	function that extracts the text inside a provided XML tag. 
#	Methodology: in case there are more than one occurrences of <XMLTAG>, this function returns the content 
#	of the FIRST occurrence of <XMLTAG>...</XMLTAG>
#	Input: Text: XML-formatted String : "[...]<XMLTAG>TextInsideXMLTAG</XMLTAG>[...]"
#		Tag: String representing the tag to be search for: "XMLTAG" 
#	Output: String containing the text "TextInsideXMLTAG"
	my $text = $_[0];
	my $tag = $_[1]; 
	
	my ($answer,$junk) = split("</$tag>",$text,2);
	($junk,$answer) = split("<$tag>",$answer,2);	
	
	return $answer;
}


sub extractTagsFromXML {
#	function that extracts the text inside a provided XML tag. 
#	Methodology: in case there are more than one occurrences of <XMLTAG>, this function returns the content 
#	of ALL the occurrence of <XMLTAG>...</XMLTAG>
#	Input: Text: XML-formatted String : "[...]<XMLTAG>TextInsideXMLTAG</XMLTAG>[...]"
#		Tag: String representing the tag to be search for: "XMLTAG" 
#	Output: Array of Strings containing the text "TextInsideXMLTAG" for each "XMLTAG" found in Tex
	my $text = $_[0];
	my $tag = $_[1]; 
	
	my @textInTags = ();
	#$text =~ m/<$tag>([\s\S]*?)<\/$tag>/;
	
	while ($text =~ m/<$tag>([\s\S]*?)<\/$tag>/g){
		push (@textInTags, $1);
		
	}
	
	
	return @textInTags;
	
}


sub loadAnnotationFile {
# 	function that loads the content of an annotation file into a string
#	Input:	complete path to the file. Type string. 
#	Output: String containing the content of the file

	if(!open(FILE,$_[0])) {
		return ;
	}
	my $file = do { local $/;  <FILE> };
	close(FILE);
	return $file;
}


sub overlap {
# 	function that checks whether two highlightings overlap more than a given treshold (allowed_dif). 
#	Particularly, the overlap should be at least "n-allowed_dif" words , where "n" is the length in words of the shortest highlighting
# 	Highlighings are provided as pairs "initial_pos ending_pos" where the positions are represented as "wordIndex.charIndex".
#	Input:	"highlighting1_initialPos highlighting1_endingPos": type string . each position has the format "Number.Number"
# 		"highlighting2_initialPos highlighting2_endingPos": type string . each position has the format "Number.Number"
# 		allowed_diference: type number (integer). Number of words that can be different. 
# 		SPECIAL CASE: if allowed_diference == -1: the overlap must be complete, i.e. the two highlightings must have all their words in common (and have the same length in words).
#	Output: True (1) if the two highlightings overlap , False (0) otherwise.

	if (($_[0] eq '') || ($_[1] eq '')){
		return 0;
	}	

	my ($H1_ini, $H1_end) = split(/ /, $_[0]);
	my ($H2_ini, $H2_end) = split(/ /, $_[1]);
	my $allowed_dif=$_[2];
	

	if ($allowed_dif == -1){	#In the most restrictive case, we need to check that the lengths of the highlightings is the same
		if (lengthHiglighting ($_[0])!= lengthHiglighting ($_[1])){
			return 0;	#if not, we are done, there is not enough overlapping
		}else{			#if the length is the same, continue checking the overlapping with 0 different words allowed
			$allowed_dif = 0;
		}
	}

	my ($H1_ini_words, $H1_ini_chars)= split(/\./, $H1_ini);
	my ($H1_end_words, $H1_end_chars)=split(/\./, $H1_end);
	my ($H2_ini_words, $H2_ini_chars)=split(/\./, $H2_ini);
 	my ($H2_end_words, $H2_end_chars)=split(/\./, $H2_end);
	
	
	my $common_words = 0;
	if ( ($H1_ini_words>=$H2_ini_words && $H1_end_words<=$H2_end_words) || ($H2_ini_words>=$H1_ini_words && $H2_end_words<=$H1_end_words) ) {
		return 1;		#One of the highlightings completely belongs to the other: Overlapping <- TRUE
	}elsif ($H1_ini_words>$H2_end_words || $H1_end_words<$H2_ini_words ){
		return 0;	#The two highlightings do not overlap at all: Overlapping <- FALSE
	}elsif ($H1_ini_words>=$H2_ini_words){	#Partial overlapping: count common words
		$common_words = $H2_end_words-$H1_ini_words+1;
	}else{
		$common_words = $H1_end_words-$H2_ini_words+1;
	}
	
	#compute the shortest length of the two highlightings
	my $shortest_length = $H1_end_words-$H1_ini_words+1;
	my $length_H2 = $H2_end_words-$H2_ini_words+1;
 	if ($length_H2 < $shortest_length){
		$shortest_length = $length_H2 ;
	}


	if ($common_words >= ($shortest_length-$allowed_dif)){
		return 1; 
	}else{
		return 0; 
	}	
}


sub lengthHiglighting {
# 	function that computes the length in words of one highlighting 
#	Input:	"highlighting1_initialPos highlighting1_endingPos": type string . each position has the format "Number.Number"
#	Output: Number representing the length in words
	my ($pos_ini, $pos_end) = split(/ /, $_[0]);

	my ($pos_ini_words, $pos_ini_chars)= split(/\./, $pos_ini);
	my ($pos_end_words, $pos_end_chars)= split(/\./, $pos_end);

	return $pos_end_words-$pos_ini_words+1;

}






