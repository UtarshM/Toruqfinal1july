<?php  
	include( "ka_include/session.php" );
	include( "ka_include/common_function.php" );
	include( "ka_include/ka_config.php" );
	include( "ka_include/check_admin_login.php" ); 
	// Check Module Rights
	$query_module_detail = "SELECT * FROM admin_login ld where adm_id='" . $_SESSION[ 'adm_id' ] . "' and adm_status=1";
	$module_query = $con->query( $query_module_detail );
	$row_md_id = $module_query->fetch_array();
	// echo $row_state['md_id']; exit;
	$md_right = explode( ",", $row_md_id[ 'md_id' ] );
	if ( !in_array( "3", $md_right ) ) {
	header( 'Location: #' );
	}
	// Check Module Rights
	$strdate = $_GET['strdate'];
	$enddate = $_GET['enddate'];
    $date_type = $_GET['date_type'];
	$strdate = date("Y-m-d", strtotime($strdate));
	$enddate = date("Y-m-d", strtotime($enddate));
	$strdate3 = date("d-m-Y", strtotime($strdate));
	$enddate3 = date("d-m-Y", strtotime($enddate));
	$strdate22 = date("d_M_Y");
	if($date_type==1){
		$dtws_qu = "and Date(td.tkn_insurance_date) >= '$strdate' and Date(td.tkn_insurance_date) <= '$enddate'";
		$fl_nam = "Insurance";
	  } else if($date_type==2){
		$dtws_qu = "and Date(td.tkn_cf_date) >= '$strdate' and Date(td.tkn_cf_date) <= '$enddate'";
		$fl_nam = "CF";
	  } else if($date_type==3){
		$dtws_qu = "and Date(td.tkn_reg_date) >= '$strdate' and Date(td.tkn_reg_date) <= '$enddate'";
		$fl_nam = "Registration";
	  } else if($date_type==4){
		$dtws_qu = "and Date(td.tkn_permit_date) >= '$strdate' and Date(td.tkn_permit_date) <= '$enddate'";
		$fl_nam = "Permit";
	  } else if($date_type==5){
		$dtws_qu = "and Date(td.tkn_nat_permit_date) >= '$strdate' and Date(td.tkn_nat_permit_date) <= '$enddate'";
		$fl_nam = "National Permit";
	  } else if($date_type==6){
		$dtws_qu = "and Date(td.tkn_tax_date) >= '$strdate' and Date(td.tkn_tax_date) <= '$enddate'";
		$fl_nam = "Tax";
	  } else {
		$dtws_qu = "and Date(td.tkn_insurance_date) >= '$strdate' and Date(td.tkn_insurance_date) <= '$enddate'";
		$fl_nam = "Global ";
	  } 
	  // echo $dtws_qu; exit; 
	  if ( $_SESSION[ 'adm_type' ] == 0 ) { // Admin 
		// Check Module Rights
		$queryCollection = "SELECT * FROM taken_detail td,  status_detail st  where td.tkn_status!=3 and td.tkn_action IN (1,2) ".$dtws_qu." and st.status_id=td.tkn_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.tkn_id";
	  } else {
		// Check Module Rights
		$queryCollection = "SELECT * FROM taken_detail td,  status_detail st  where td.tkn_status!=3 and td.tkn_action IN (1,2) ".$dtws_qu." and st.status_id=td.tkn_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.tkn_adm_id=".$_SESSION[ 'adm_id' ]." ORDER BY td.tkn_id";
	  }
	  $resultCollection = $con->query($queryCollection);
	  $total_records_rep = $resultCollection->num_rows;
	  // echo $total_records_rep; exit;
	if($total_records_rep<=0){
		header( 'Location: taken_view.php?msg=empty&strdate='.$strdate3.'&enddate='.$enddate3.'&date_type='.$date_type.'' );
	}
?>
<?php
$date = time();
header("Content-type: application/vnd-ms-excel");
	header("Content-Disposition: attachment; filename=Taken-".$fl_nam."ReportDateWise-$strdate22.xls");
?>
<table border="1" style="text-align: left;">
  <tr style="text-align: left; background:#000; color: #fff;">
    <th style="text-align: left;">Series</th>
    <th style="text-align: left;"><?php echo $fl_nam; ?> Date</th>
    <th style="text-align: left;">Register No. </th>
    <th style="text-align: left;">Name</th>
    <th style="text-align: left;">Contact</th>
    <th style="text-align: left;">Model</th>
    <th style="text-align: left;">Assign</th>
    <th style="text-align: left;">Status</th>
   </tr>
  <?php
	$no = 1;
	$counter = 1;
	$result_collaction = $con->query($queryCollection);
	while ($collectionData = $result_collaction->fetch_object()) {
 			// $datend = new DateTime( $collectionData->chq_date ); 
			// $col_date = $datend->format( 'd-m-Y' );
			if($date_type==1){
				$datend = new DateTime( $collectionData->tkn_insurance_date );
				$dt_dis = $datend->format( 'd-m-Y' );
			} else if($date_type==2){
			$datend = new DateTime( $collectionData->tkn_cf_date );
			$dt_dis = $datend->format( 'd-m-Y' );
			} else if($date_type==3){
			$datend = new DateTime( $collectionData->tkn_reg_date );
				$dt_dis = $datend->format( 'd-m-Y' );
			} else if($date_type==4){
			$datend = new DateTime( $collectionData->tkn_permit_date );
			$dt_dis = $datend->format( 'd-m-Y' );
			} else if($date_type==5){
			$datend = new DateTime( $collectionData->tkn_nat_permit_date );
				$dt_dis = $datend->format( 'd-m-Y' );
			} else if($date_type==6){
			$datend = new DateTime( $collectionData->tkn_tax_date );
			$dt_dis = $datend->format( 'd-m-Y' );
			} else {
			$datend = new DateTime( $collectionData->tkn_date );
			$dt_dis = $datend->format( 'd-m-Y' );
			}

			$query_asign_detail = "SELECT * FROM admin_login ld where ld.adm_id=".$collectionData->tkn_adm_id;
			$asign_query = $con->query( $query_asign_detail );
			$row_asign = $asign_query->fetch_object();
			$asign_name = $row_asign->adm_username;

			if($collectionData->tkn_action==1) {
				$st_name = "Pending";
			  } elseif($collectionData->tkn_action==2) {
				$st_name = "Rejected - ";
				$query_rejres_detail = "SELECT * FROM rej_res_detail ld where ld.rej_res_id=".$collectionData->rej_res_id;
				$rejres_query = $con->query( $query_rejres_detail );
				$row_rejres = $rejres_query->fetch_object();
				$rejres_name = $row_rejres->rej_res_name;
				$st_res = $rejres_name;
			  } elseif($collectionData->tkn_action==3) {
				$st_name = "Completed";
			  }
 			echo '<tr style="background:'.$tr_col.'">';
			echo '<td>'.$collectionData->tkn_series.'</td>';	
			echo '<td>'.$dt_dis.'</td>';	
			echo '<td>'.$collectionData->tkn_reg_no.'</td>';	
			echo '<td>'.$collectionData->tkn_name.'</td>';	
			echo '<td>'.$collectionData->tkn_contact.'</td>';	
			echo '<td>'.$collectionData->tkn_vmodel.'</td>';	
			echo '<td>'.$asign_name.'</td>';	
 			echo '<td>'.$st_name.$st_res.'</td>';	
 			echo '</tr>';
		$no++;
 	}  
	?>  
</table>