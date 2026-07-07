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
	if ( !in_array( "16", $md_right ) ) {
	header( 'Location: #' );
	}
	// Check Module Rights
	$cus_id=$_GET['cus_id'];	
 	if(!empty($_GET['cus_id']))
	{
 		$updated_by=$_SESSION['adm_id'];
		$updated_date = date("Y-m-d H:i:s"); 
		$query_state_detail = "SELECT * FROM customer_detail ld where ld.cus_id=".$cus_id;
		$result_query = $con->query($query_state_detail);
		$row_state_img=$result_query->fetch_object();
		unlink('img/cus_photo_file/'.$row_state_img->cus_photo);
		$cus_photo="";
		$sql_document_updt = "UPDATE customer_detail SET cus_photo='".$cus_photo."', updated_by='".$updated_by."', updated_date='".$updated_date."' WHERE cus_id=".$cus_id;
		$updated_qu=$con->query($sql_document_updt);
		header('Location: customer_edit.php?flag=3&cus_id='.$cus_id);
	}	
	// redirect("ka-admin/customer_documents.php?flag=3&cus_id=".$cus_id);
?>
