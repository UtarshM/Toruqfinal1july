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
	if ( !in_array( "13", $md_right ) ) {
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
		$query_expe_tot = "SELECT * FROM rto_detail td,  status_detail st  where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2) and Date(td.rto_date) >= '$strdate' and Date(td.rto_date) <= '$enddate' and st.status_id=td.rto_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.rto_id";
		$result_tot = $con->query( $query_expe_tot );
		$total_records_rep = $result_tot->num_rows;
  
		$queryCollection = "SELECT * FROM rto_detail td, status_detail st  where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2) and Date(td.rto_date) >= '$strdate' and Date(td.rto_date) <= '$enddate' and st.status_id=td.rto_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.rto_id";
		
		$query_tot_amount = "SELECT SUM(td.rto_amount) as tot_amount FROM rto_detail td where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2) and Date(td.rto_date) >= '$strdate' and Date(td.rto_date) <= '$enddate' and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.rto_id";
		$result_tot_amount = $con->query( $query_tot_amount );
		$row_tot_amount = $result_tot_amount->fetch_object();
		$final_tot_amount = $row_tot_amount->tot_amount;
		
		$query_crdt_amount = "SELECT SUM(td.rto_credit) as crdt_amount FROM rto_detail td where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2) and Date(td.rto_date) >= '$strdate' and Date(td.rto_date) <= '$enddate' and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.rto_id";
		$result_crdt_amount = $con->query( $query_crdt_amount );
		$row_crdt_amount = $result_crdt_amount->fetch_object();
		$final_crdt_amount = $row_crdt_amount->crdt_amount;
		
		$query_dbt_amount = "SELECT SUM(td.rto_debit) as dbt_amount FROM rto_detail td where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2) and Date(td.rto_date) >= '$strdate' and Date(td.rto_date) <= '$enddate' and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.rto_id";
		$result_dbt_amount = $con->query( $query_dbt_amount );
		$row_dbt_amount = $result_dbt_amount->fetch_object();
		$final_dbt_amount = $row_dbt_amount->dbt_amount;
  
	  } else {
		// Check Module Rights
		$query_expe_tot = "SELECT * FROM rto_detail td,  status_detail st  where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2) and Date(td.rto_date) >= '$strdate' and Date(td.rto_date) <= '$enddate' and st.status_id=td.rto_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.rto_adm_id=".$_SESSION[ 'adm_id' ]." ORDER BY td.rto_id";
		$result_tot = $con->query( $query_expe_tot );
		$total_records_rep = $result_tot->num_rows;
  
		$queryCollection = "SELECT * FROM rto_detail td, status_detail st  where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2) and Date(td.rto_date) >= '$strdate' and Date(td.rto_date) <= '$enddate' and st.status_id=td.rto_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.rto_adm_id=".$_SESSION[ 'adm_id' ]." ORDER BY td.rto_id";
  
		$query_tot_amount = "SELECT SUM(td.rto_amount) as tot_amount FROM rto_detail td where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2) and Date(td.rto_date) >= '$strdate' and Date(td.rto_date) <= '$enddate' and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.rto_adm_id=".$_SESSION[ 'adm_id' ]." ORDER BY td.rto_id";
		$result_tot_amount = $con->query( $query_tot_amount );
		$row_tot_amount = $result_tot_amount->fetch_object();
		$final_tot_amount = $row_tot_amount->tot_amount;
		
		$query_crdt_amount = "SELECT SUM(td.rto_credit) as crdt_amount FROM rto_detail td where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2) and Date(td.rto_date) >= '$strdate' and Date(td.rto_date) <= '$enddate' and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.rto_adm_id=".$_SESSION[ 'adm_id' ]." ORDER BY td.rto_id";
		$result_crdt_amount = $con->query( $query_crdt_amount );
		$row_crdt_amount = $result_crdt_amount->fetch_object();
		$final_crdt_amount = $row_crdt_amount->crdt_amount;
		
		$query_dbt_amount = "SELECT SUM(td.rto_debit) as dbt_amount FROM rto_detail td where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2) and Date(td.rto_date) >= '$strdate' and Date(td.rto_date) <= '$enddate' and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.rto_adm_id=".$_SESSION[ 'adm_id' ]." ORDER BY td.rto_id";
		$result_dbt_amount = $con->query( $query_dbt_amount );
		$row_dbt_amount = $result_dbt_amount->fetch_object();
		$final_dbt_amount = $row_dbt_amount->dbt_amount;
  
	  }

	// $queryCollection = "SELECT * FROM cheque_detail td  where td.chq_status=1 and td.branch_id=".$_SESSION[ 'adm_branch' ]." ".$aol_tp_qu." and Date(td.chq_date) >= '$strdate' and Date(td.chq_date) <= '$enddate'  ORDER BY td.chq_date DESC";
	// // and al.added_by=" . $_SESSION['user_id'] . "
	// $resultCollection = $con->query($queryCollection);
	// $total_records_rep = $resultCollection->num_rows;

	
	// echo $total_records_rep; exit;
	if($total_records_rep<=0){
		header( 'Location: vahan_view.php?msg=empty&strdate='.$strdate3.'&enddate='.$enddate3.'' );
	}

	 
?>
<?php
$date = time();
header("Content-type: application/vnd-ms-excel");
 
	header("Content-Disposition: attachment; filename=".$fl_nam."VahanWorkReportDateWise-$strdate22.xls");
?>
<h4 class="text-center"> 
	<span style="color: blue;">Total Amount : <b><?php echo "&#8377;".number_format($final_tot_amount,2); ?></b></span> - <span style="color: green;">Credit [Jama] : <b><?php echo "&#8377;".number_format($final_crdt_amount,2); ?></b></span> = <span style="color: red;">Debit [Baki] : <b><?php echo "&#8377;".number_format($final_dbt_amount,2); ?></b></span> 
</h4>
<table border="1" style="text-align: left;">


  <tr style="text-align: left; background:#000; color: #fff;">
    <th style="text-align: left;">ID</th>
    <th style="text-align: left;">Date</th>
    <th style="text-align: left;">Due Date</th>
    <th style="text-align: left;">Register No. </th>
    <th style="text-align: left;">Name</th>
    <th style="text-align: left;">Contact</th>
    <th style="text-align: left;">Amount</th>
    <th style="text-align: left;">Assign</th>
    <th style="text-align: left;">Status</th>
  </tr>
  <?php
	$no = 1;
	$counter = 1;
	$result_collaction = $con->query($queryCollection);
	while ($collectionData = $result_collaction->fetch_object()) {

 			$datend_rto_date = new DateTime( $collectionData->rto_date ); 
			$col_rto_date = $datend_rto_date->format( 'd-m-Y' );
 			$datend_rto_duedate = new DateTime( $collectionData->rto_duedate ); 
			$col_rto_duedate = $datend_rto_duedate->format( 'd-m-Y' );

			$query_asign_detail = "SELECT * FROM admin_login ld where ld.adm_id=".$collectionData->rto_adm_id;
			$asign_query = $con->query( $query_asign_detail );
			$row_asign = $asign_query->fetch_object();
			$asign_name = $row_asign->adm_username;

			if($collectionData->rto_action==2) {
				$st_dis = "Completed";
			} elseif($collectionData->rto_action==1) {
				$st_dis = "Pending - ";
			$query_rejres_detail = "SELECT * FROM pen_res_detail ld where ld.pen_res_id=".$collectionData->pen_res_id;
			$rejres_query = $con->query( $query_rejres_detail );
			$row_rejres = $rejres_query->fetch_object();
			$rejres_name = $row_rejres->pen_res_name;
			$st_dis .= $rejres_name;
			} elseif($collectionData->rto_action==3) {
				$st_dis = "Document Delivered";
			}
 			echo '<tr style="background:'.$tr_col.'">';
			echo '<td>'.$collectionData->rto_id.'</td>';	
			echo '<td>'.$col_rto_date.'</td>';	
			echo '<td>'.$col_rto_duedate.'</td>';	
			echo '<td>'.$collectionData->rto_regno.'</td>';	
			echo '<td>'.$collectionData->rto_name.'</td>';	
			echo '<td>'.$collectionData->rto_contact.'</td>';	
			echo '<td>'.$collectionData->rto_amount." - ".$collectionData->rto_credit." = ".$collectionData->rto_debit.'</td>';	
 			echo '<td>'.$asign_name.'</td>';	
			echo '<td>'.$st_dis.'</td>';	
			echo '</tr>';
		$no++;
 	}  
	?>
   
</table>