<?php  
	include( "ka_include/session.php" );
	include( "ka_include/common_function.php" );
	include( "ka_include/ka_config.php" );
	include( "ka_include/check_admin_login.php" ); 
 	// echo "YES"; exit;
	// Check Module Rights
	$query_module_detail = "SELECT * FROM admin_login ld where adm_id='" . $_SESSION[ 'adm_id' ] . "' and adm_status=1";
	$module_query = $con->query( $query_module_detail );
	$row_md_id = $module_query->fetch_array();
	// echo $row_state['md_id']; exit;
	$md_right = explode( ",", $row_md_id[ 'md_id' ] );
	if ( !in_array( "14", $md_right ) ) {
	header( 'Location: #' );
	}
	// Check Module Rights
	$strdate = $_GET['strdate'];
	$enddate = $_GET['enddate'];
	$strdate = date("Y-m-d", strtotime($strdate));
	$enddate = date("Y-m-d", strtotime($enddate));
	 
	$strdate3 = date("d-m-Y", strtotime($strdate));
	$enddate3 = date("d-m-Y", strtotime($enddate));
	$strdate22 = date("d_M_Y");
	 


	$queryCollection = "SELECT * FROM salary_detail td, admin_login ad  where ad.adm_id=td.adm_id and td.slr_status=1 and td.branch_id=".$_SESSION[ 'adm_branch' ]." ".$aol_tp_qu." and Date(td.slr_date) >= '$strdate' and Date(td.slr_date) <= '$enddate'  ORDER BY td.slr_date DESC";
	// and al.added_by=" . $_SESSION['user_id'] . "
	$resultCollection = $con->query($queryCollection);
	$total_records_rep = $resultCollection->num_rows;

	
	// echo $total_records_rep; exit;
	if($total_records_rep<=0){
		header( 'Location: salary_view.php?msg=empty&strdate='.$strdate3.'&enddate='.$enddate3.'' );
	}

	 
?>
<?php
$date = time();
header("Content-type: application/vnd-ms-excel");
 
	header("Content-Disposition: attachment; filename=".$fl_nam."SalaryReportDateWise-$strdate22.xls");
?>
<table border="1" style="text-align: left;">
	 
  <tr style="text-align: left; background:#000; color: #fff;">
    <th style="text-align: left;">User</th>
    <th style="text-align: left;">Date</th>
    <th style="text-align: left;">Salary</th>
    <th style="text-align: left;">Days</th>
   </tr>
  <?php
	$no = 1;
	$counter = 1;
	$result_collaction = $con->query($queryCollection);
	while ($collectionData = $result_collaction->fetch_object()) {
 			$datend = new DateTime( $collectionData->slr_date ); 
			$col_date = $datend->format( 'd-m-Y' );
 			echo '<tr style="background:'.$tr_col.'">';
			echo '<td>'.$collectionData->adm_username.'</td>';	
			echo '<td>'.$col_date.'</td>';	
			echo '<td>'.$collectionData->slr_fix." - ".$collectionData->slr_paid." = ".$collectionData->slr_ded.'</td>';	
			echo '<td>'.$collectionData->slr_pre." , ".$collectionData->slr_abs.'</td>';	
 			echo '</tr>';
		$no++;
 	}  
	?>
</table>