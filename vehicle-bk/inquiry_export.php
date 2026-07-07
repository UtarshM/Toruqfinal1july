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
	$strdate = date("Y-m-d", strtotime($strdate));
	$enddate = date("Y-m-d", strtotime($enddate));
	$strdate3 = date("d-m-Y", strtotime($strdate));
	$enddate3 = date("d-m-Y", strtotime($enddate));
	$strdate22 = date("d_M_Y");
	 
		 
	   
 	  if ( $_SESSION[ 'adm_type' ] == 0 ) { // Admin 
		// Check Module Rights
		$queryCollection = "SELECT * FROM inquiry_detail td,  status_detail st  where td.inq_status!=3 and td.inq_action IN (1,2,3)  and st.status_id=td.inq_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.inq_id";
	  } else {
		// Check Module Rights
		$queryCollection = "SELECT * FROM inquiry_detail td,  status_detail st  where td.inq_status!=3 and td.inq_action IN (1,2,3)  and st.status_id=td.inq_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]."  ORDER BY td.inq_id";
	  }
	  $resultCollection = $con->query($queryCollection);
	  $total_records_rep = $resultCollection->num_rows;
	  // echo $total_records_rep; exit;
	if($total_records_rep<=0){
		header( 'Location: inquiry_view.php?msg=empty&strdate='.$strdate3.'&enddate='.$enddate3.'' );
	}
?>
<?php
$date = time();
header("Content-type: application/vnd-ms-excel");
	header("Content-Disposition: attachment; filename=Inquiry-ReportDateWise-$strdate22.xls");
?>
<table border="1" style="text-align: left;">
  <tr style="text-align: left; background:#000; color: #fff;">
     <th style="text-align: left;">Id</th>
     <th style="text-align: left;">Date</th>
     <th style="text-align: left;">Name</th>
    <th style="text-align: left;">Contact</th>
    <th style="text-align: left;">Address</th>
    <th style="text-align: left;">Remarks</th>
     <th style="text-align: left;">Status</th>
   </tr>
  <?php
	$no = 1;
	$counter = 1;
	$result_collaction = $con->query($queryCollection);
	while ($collectionData = $result_collaction->fetch_object()) {
 			 
		$datend = new DateTime( $collectionData->inq_date );
		$dt_dis = $datend->format( 'd-m-Y' );
			 

			if($collectionData->inq_action==1) {
				$st_name = "Pending";
			  } elseif($collectionData->inq_action==2) {
				$st_name = "Rejected - ";
				$query_rejres_detail = "SELECT * FROM rej_res_detail ld where ld.rej_res_id=".$collectionData->rej_res_id;
				$rejres_query = $con->query( $query_rejres_detail );
				$row_rejres = $rejres_query->fetch_object();
				$rejres_name = $row_rejres->rej_res_name;
				$st_res = $rejres_name;
			  } elseif($collectionData->inq_action==3) {
				$st_name = "Completed";
			  }
 			echo '<tr style="background:'.$tr_col.'">';
 			echo '<td>'.$collectionData->inq_id.'</td>';	
 			echo '<td>'.$dt_dis.'</td>';	
 			echo '<td>'.$collectionData->inq_name.'</td>';	
			echo '<td>'.$collectionData->inq_contact.'</td>';	
			echo '<td>'.$collectionData->inq_address.'</td>';	
			echo '<td>'.$collectionData->inq_remarks.'</td>';	
  			echo '<td>'.$st_name.$st_res.'</td>';	
 			echo '</tr>';
		$no++;
 	}  
	?>  
</table>