<?php
	include("ka_include/session.php");
	include("ka_include/common_function.php");
	include("ka_include/ka_config.php");
 	include("ka_include/check_admin_login.php");
	 if ( $_SESSION[ 'adm_type' ] != 0 ) {
		header( 'Location: #' );
	  }
	
	$gen_id=$_GET['gen_id'];	
 	if(isset($_GET['status_id']) && $_GET['status_id']!="")
 	$status_id=$_GET['status_id'];	
 	if(!empty($_GET['document_id']))
	{
		$document_id=$_GET['document_id'];		
		$updated_by=$_SESSION['adm_id'];
		$updated_date = date("Y-m-d H:i:s"); 
		
		$query_state_detail = "SELECT * FROM document_detail ld where ld.document_id=".$document_id;
		$result_query = $con->query($query_state_detail);
		$row_state_img=$result_query->fetch_object();
		unlink('img/document_files/'.$row_state_img->document_image);
		
		$document_image="";
			
		$sql_document_updt = "UPDATE document_detail SET document_status='3', document_image='".$document_image."', updated_by='".$updated_by."', updated_date='".$updated_date."' WHERE document_id=".$document_id;
		$updated_qu=$con->query($sql_document_updt);
		
		header('Location: genral_documents.php?flag=3&gen_id='.$gen_id);
	}	

?>
