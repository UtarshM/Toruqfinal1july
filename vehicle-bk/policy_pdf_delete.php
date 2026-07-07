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
	if ( !in_array( "11", $md_right ) ) {
	header( 'Location: insurance_dashboard.php' );
	}
	// Check Module Rights
	$plc_id=$_GET['plc_id'];	
 	if(!empty($_GET['plc_id']))
	{
 		$updated_by=$_SESSION['adm_id'];
		$updated_date = date("Y-m-d H:i:s"); 
		$query_state_detail = "SELECT * FROM policy_detail ld where ld.plc_id=".$plc_id;
		$result_query = $con->query($query_state_detail);
		$row_state_img=$result_query->fetch_object();
		unlink('img/plc_pdf_file/'.$row_state_img->plc_pdf);
		$plc_pdf="";
		$sql_document_updt = "UPDATE policy_detail SET plc_pdf='".$plc_pdf."', updated_by='".$updated_by."', updated_date='".$updated_date."' WHERE plc_id=".$plc_id;
		$updated_qu=$con->query($sql_document_updt);
		header('Location: policy_edit.php?flag=3&plc_id='.$plc_id);
	}	
	// redirect("ka-admin/policy_documents.php?flag=3&plc_id=".$plc_id);
?>
