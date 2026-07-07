<?php
	include("ka_include/session.php");
	include("ka_include/common_function.php");
	include("ka_include/ka_config.php");
 	include("ka_include/check_admin_login.php");
	// Check Module Rights
	$query_module_detail = "SELECT * FROM admin_login ld where adm_id='" . $_SESSION[ 'adm_id' ] . "' and adm_status=1";
	$module_query = $con->query( $query_module_detail );
	$row_md_id = $module_query->fetch_array();
	// echo $row_state['md_id']; exit;
	$md_right = explode( ",", $row_md_id[ 'md_id' ] );
	if ( !in_array( "5", $md_right ) ) {
	header( 'Location: rto_dashboard.php' );
	}
	// Check Module Rights
	
	$rot_id=$_GET['rot_id'];	
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
		
		header('Location: rto_documents.php?flag=3&rot_id='.$rot_id);
	}	
	// redirect("ka-admin/rto_documents.php?flag=3&rot_id=".$rot_id);

?>
